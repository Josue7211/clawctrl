//! Session lifecycle regressions use disposable SQLite and a loopback auth service.
//! They never read the user's credentials or contact a configured provider.

use super::*;
use axum::{
    routing::{get, post},
    Json,
};
use serde_json::{json, Value};
use sqlx::SqlitePool;

fn session() -> UserSession {
    UserSession {
        access_token: "r01-fixture-access".into(),
        refresh_token: "r01-fixture-refresh".into(),
        user_id: "r01-fixture-user".into(),
        email: "r01@example.test".into(),
        expires_at: epoch_secs() + 3600,
        encryption_key: vec![0x42; 32],
        mfa_verified: true,
        factor_id: None,
        factor_type: None,
        available_mfa_methods: vec![],
        created_at: epoch_secs(),
    }
}

async fn state(base: &str) -> AppState {
    let db = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .unwrap();
    crate::session_persistence::initialize(&db).await.unwrap();
    for query in [
        "CREATE TABLE api_cache (user_id TEXT)",
        "CREATE TABLE security_events (event_type TEXT, user_id TEXT, details TEXT)",
        "CREATE TABLE audit_log (user_id TEXT, action TEXT, resource_type TEXT, resource_id TEXT, details TEXT)",
    ] { sqlx::query(query).execute(&db).await.unwrap(); }
    let mut secrets = std::collections::HashMap::new();
    secrets.insert("SUPABASE_URL".into(), base.into());
    secrets.insert("SUPABASE_ANON_KEY".into(), "r01-fixture-public-key".into());
    AppState {
        app: None,
        db,
        http: reqwest::Client::new(),
        secrets: Arc::new(std::sync::RwLock::new(secrets)),
        bb: None,
        harness: None,
        gateway_ws: None,
        session: Arc::new(RwLock::new(Some(session()))),
        refresh_mutex: Arc::new(tokio::sync::Mutex::new(())),
        session_validated_at: Arc::new(RwLock::new(0)),
        pending_oauth: Arc::new(RwLock::new(None)),
    }
}

async fn seed(db: &SqlitePool) {
    let (ciphertext, nonce) =
        crate::crypto::encrypt(&serde_json::to_vec(&session()).unwrap(), &[0x37; 32]).unwrap();
    sqlx::query("INSERT OR REPLACE INTO _dev_session_secure VALUES (1,?,?)")
        .bind(ciphertext)
        .bind(nonce)
        .execute(db)
        .await
        .unwrap();
}

async fn saved_count(db: &SqlitePool) -> i64 {
    sqlx::query_scalar("SELECT count(*) FROM _dev_session_secure")
        .fetch_one(db)
        .await
        .unwrap()
}

struct HttpServer {
    base: String,
    task: tokio::task::JoinHandle<()>,
}

impl Drop for HttpServer {
    fn drop(&mut self) {
        self.task.abort();
    }
}

async fn serve(router: Router) -> HttpServer {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    HttpServer { base, task }
}

async fn provider(status: StatusCode, user: &str) -> HttpServer {
    let body = json!({"id":user});
    serve(
        Router::new()
            .route(
                "/auth/v1/user",
                get(move || {
                    let body = body.clone();
                    async move { (status, Json(body)) }
                }),
            )
            .route(
                "/auth/v1/token",
                post(|| async {
                    (
                        StatusCode::UNAUTHORIZED,
                        Json(json!({"error":"invalid_grant"})),
                    )
                }),
            )
            .route("/auth/v1/logout", post(|| async { Json(json!({})) })),
    )
    .await
}

#[tokio::test]
async fn restored_session_is_verified_before_use() {
    let auth = provider(StatusCode::OK, "r01-fixture-user").await;
    let state = state(&auth.base).await;
    seed(&state.db).await;
    validate_restored_session(&state).await;
    assert!(state.session.read().await.is_some());
    assert!(*state.session_validated_at.read().await > 0);
    assert_eq!(saved_count(&state.db).await, 1);
}

#[tokio::test]
async fn revoked_wrong_subject_and_unverifiable_restores_require_login() {
    for (status, user) in [
        (StatusCode::UNAUTHORIZED, "r01-fixture-user"),
        (StatusCode::OK, "another-user"),
        (StatusCode::SERVICE_UNAVAILABLE, "r01-fixture-user"),
    ] {
        let auth = provider(status, user).await;
        let state = state(&auth.base).await;
        seed(&state.db).await;
        validate_restored_session(&state).await;
        assert!(state.session.read().await.is_none());
        assert_eq!(*state.session_validated_at.read().await, 0);
        assert_eq!(saved_count(&state.db).await, 0);
    }
}

#[tokio::test]
async fn logout_clears_saved_state_and_late_saves_cannot_restore_it() {
    let auth = provider(StatusCode::OK, "r01-fixture-user").await;
    let state = state(&auth.base).await;
    let snapshot = state.session.read().await.clone().unwrap();
    seed(&state.db).await;
    let app = serve(
        Router::new()
            .nest("/api/auth", crate::routes::auth::router())
            .with_state(state.clone()),
    )
    .await;
    let client = reqwest::Client::new();
    assert!(client
        .post(format!("{}/api/auth/logout", app.base))
        .send()
        .await
        .unwrap()
        .status()
        .is_success());
    assert!(state.session.read().await.is_none());
    save_dev_session(&state, &snapshot).await;
    assert!(
        crate::routes::auth::update_current_session(&state, &snapshot)
            .await
            .is_err()
    );
    assert_eq!(saved_count(&state.db).await, 0);
    assert!(crate::session_persistence::restore(&state.db)
        .await
        .unwrap()
        .is_none());
    let response: Value = client
        .get(format!("{}/api/auth/session", app.base))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(response["authenticated"], false);
    let audits: i64 = sqlx::query_scalar("SELECT count(*) FROM audit_log WHERE action='logout'")
        .fetch_one(&state.db)
        .await
        .unwrap();
    assert_eq!(audits, 1);
}

#[tokio::test]
async fn expired_refresh_clears_persistence_and_logout_storage_failure_is_visible() {
    let auth = provider(StatusCode::OK, "r01-fixture-user").await;
    let state = state(&auth.base).await;
    state.session.write().await.as_mut().unwrap().created_at = epoch_secs() - 86_400;
    seed(&state.db).await;
    let app = serve(
        Router::new()
            .nest("/api/auth", crate::routes::auth::router())
            .with_state(state.clone()),
    )
    .await;
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/auth/refresh", app.base))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert!(state.session.read().await.is_none());
    assert_eq!(saved_count(&state.db).await, 0);
    sqlx::query("DROP TABLE _dev_session_secure")
        .execute(&state.db)
        .await
        .unwrap();
    let response = client
        .post(format!("{}/api/auth/logout", app.base))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[tokio::test]
async fn a_late_refresh_response_cannot_recreate_a_cleared_session() {
    let started = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let (entered, finish) = (started.clone(), release.clone());
    let auth=serve(Router::new().route("/auth/v1/token",post(move || {
        let (entered,finish)=(entered.clone(),finish.clone());
        async move {
            entered.notify_one(); finish.notified().await;
            Json(json!({"access_token":"new-access","refresh_token":"new-refresh","expires_in":3600,"user":{"id":"r01-fixture-user"}}))
        }
    }))).await;
    let state = state(&auth.base).await;
    seed(&state.db).await;
    let copy = state.clone();
    let snapshot = session();
    let refresh = tokio::spawn(async move { refresh_session_tokens(&copy, &snapshot).await });
    tokio::time::timeout(Duration::from_secs(5), started.notified())
        .await
        .unwrap();
    *state.session.write().await = None;
    clear_dev_session(&state.db).await.unwrap();
    release.notify_one();
    assert!(refresh.await.unwrap().is_err());
    assert!(state.session.read().await.is_none());
    assert_eq!(saved_count(&state.db).await, 0);
}

/// An opt-in disposable backend for the mandatory live browser verification.
/// The browser drives the real auth routes; all provider credentials are fixtures.
#[tokio::test]
#[ignore = "manual browser review fixture; requires R01_BROWSER_REVIEW_FILE"]
async fn browser_review_fixture() {
    let path = std::path::PathBuf::from(
        std::env::var("R01_BROWSER_REVIEW_FILE").expect("review metadata path required"),
    );
    let auth = provider(StatusCode::OK, "r01-fixture-user").await;
    let state = state(&auth.base).await;
    seed(&state.db).await;
    *state.session_validated_at.write().await = epoch_secs();
    let app = serve(
        Router::new()
            .nest("/api/auth", crate::routes::auth::router())
            .with_state(state.clone()),
    )
    .await;
    std::fs::write(
        &path,
        serde_json::to_vec(&json!({"base":app.base})).unwrap(),
    )
    .unwrap();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(180);
    while !path.with_extension("done").exists() {
        assert!(
            tokio::time::Instant::now() < deadline,
            "browser review timed out"
        );
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    assert!(state.session.read().await.is_none());
    assert_eq!(saved_count(&state.db).await, 0);
}

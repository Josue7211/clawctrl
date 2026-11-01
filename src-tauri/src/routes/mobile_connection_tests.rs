use super::contract_tests::{exchange, session, Fixture};
use super::*;
use crate::server::{with_authentication, UserSession, MC_API_KEY};
use tokio::task::JoinHandle;

async fn server(f: &Fixture, owner: Option<UserSession>) -> (String, JoinHandle<()>) {
    MC_API_KEY.get_or_init(|| "disposable-desktop-key".into());
    let routes = Router::new().nest("/api", router().merge(crate::routes::mobile::router()));
    let app = with_authentication(routes, f.state.clone()).with_state(f.state.clone());
    let app = if let Some(owner) = owner {
        app.layer(axum::Extension(owner))
    } else {
        app
    };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (origin, task)
}
async fn issue(f: &Fixture, origin: &str) -> Value {
    let response = f
        .client
        .post(format!("{origin}/api/mobile/devices"))
        .header("x-api-key", MC_API_KEY.get().unwrap())
        .json(&json!({"name":"Fixture phone"}))
        .send()
        .await
        .unwrap();
    exchange(response, 200, "NotesDeviceIssueResponse").await
}

#[tokio::test]
async fn mobile_connects_to_real_notes_without_desktop_session_or_vite() {
    let f = Fixture::new().await;
    let (owner, owner_task) = server(&f, Some(session(true))).await;
    let issued = issue(&f, &owner).await;
    let token = issued["data"]["token"].as_str().unwrap();
    let (remote, remote_task) = server(&f, None).await;
    let capabilities = exchange(
        f.client
            .get(format!("{remote}/api/mobile/capabilities"))
            .bearer_auth(token)
            .send()
            .await
            .unwrap(),
        200,
        "MobileCapabilitiesResponse",
    )
    .await;
    assert_eq!(capabilities["data"]["backend"]["mode"], "headless");
    assert_eq!(capabilities["data"]["backend"]["must_remain_running"], true);
    let url = format!("{remote}/api/vault/local/doc?id=Phone%2FCapture.md");
    let created = exchange(
        f.client
            .put(&url)
            .bearer_auth(token)
            .json(&json!({"content":"captured from a phone","operation_id":"phone:1"}))
            .send()
            .await
            .unwrap(),
        200,
        "NoteWriteResponse",
    )
    .await;
    let read = exchange(
        f.client.get(&url).bearer_auth(token).send().await.unwrap(),
        200,
        "NoteReadResponse",
    )
    .await;
    assert_eq!(read["data"]["_rev"], created["data"]["rev"]);
    exchange(
        f.client
            .put(&url)
            .bearer_auth(token)
            .json(&json!({"content":"phone edit","_rev":created["data"]["rev"]}))
            .send()
            .await
            .unwrap(),
        200,
        "NoteWriteResponse",
    )
    .await;
    let listed = exchange(
        f.client
            .get(format!("{remote}/api/vault/local/documents"))
            .bearer_auth(token)
            .send()
            .await
            .unwrap(),
        200,
        "NoteListResponse",
    )
    .await;
    assert_eq!(listed["data"]["notes"][0]["content"], "phone edit");
    assert_eq!(
        f.read("Phone/Capture.md").await["data"]["content"],
        "phone edit"
    );
    let hash: String = sqlx::query_scalar("SELECT token_hash FROM mobile_devices")
        .fetch_one(&f.state.db)
        .await
        .unwrap();
    assert_eq!(hash.len(), 64);
    assert_ne!(hash, token);
    let listing: Value = f
        .client
        .get(format!("{owner}/api/mobile/devices"))
        .header("x-api-key", MC_API_KEY.get().unwrap())
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert!(crate::notes_contract::validator("NotesDeviceListResponse").is_valid(&listing));
    assert!(!listing.to_string().contains(token));
    assert!(!listing.to_string().contains("token_hash"));
    owner_task.abort();
    remote_task.abort();
}

#[tokio::test]
async fn mobile_scope_cannot_escape_to_desktop_or_auth_even_with_owner_session_and_key() {
    let f = Fixture::new().await;
    let (origin, task) = server(&f, Some(session(true))).await;
    let issued = issue(&f, &origin).await;
    let token = issued["data"]["token"].as_str().unwrap();
    for (method, path) in [
        ("GET", "/api/mobile/devices"),
        ("POST", "/api/mobile/devices"),
        ("POST", "/api/auth/login"),
        ("POST", "/api/setup/pair"),
        ("GET", "/api/messages/attachment/x"),
        ("GET", "/api/terminal/ws"),
        ("DELETE", "/api/vault/local/doc?id=keep.md"),
        ("GET", "/api/vault/local/documents/keep.md"),
        ("PUT", "/api/vault/local/folder?path=test"),
        ("POST", "/api/vault/local/import"),
    ] {
        let response = f
            .client
            .request(method.parse().unwrap(), format!("{origin}{path}"))
            .bearer_auth(token)
            .header("x-api-key", MC_API_KEY.get().unwrap())
            .json(&json!({}))
            .send()
            .await
            .unwrap();
        exchange(response, 403, "ErrorResponse").await;
    }
    // Other integrations' bearer formats retain the original desktop key path.
    exchange(
        f.client
            .get(format!("{origin}/api/vault/local/documents"))
            .header("x-api-key", MC_API_KEY.get().unwrap())
            .bearer_auth("unrelated-integration-token")
            .send()
            .await
            .unwrap(),
        200,
        "NoteListResponse",
    )
    .await;
    assert_eq!(f.count("vault_documents").await, 0);
    let response = f
        .client
        .get(format!("{origin}/api/vault/local/documents"))
        .header("x-api-key", MC_API_KEY.get().unwrap())
        .bearer_auth("ccm_v1.invalid")
        .send()
        .await
        .unwrap();
    assert_eq!(response.headers()["cache-control"], "no-store");
    assert!(response.headers()["www-authenticate"]
        .to_str()
        .unwrap()
        .contains("invalid_token"));
    exchange(response, 401, "ErrorResponse").await;
    task.abort();
}

#[tokio::test]
async fn mobile_credentials_revoke_independently_expire_and_recheck_inside_writes() {
    let f = Fixture::new().await;
    let (origin, task) = server(&f, Some(session(true))).await;
    let first = issue(&f, &origin).await;
    let second = issue(&f, &origin).await;
    let token = first["data"]["token"].as_str().unwrap();
    let id = first["data"]["device"]["id"].as_str().unwrap();
    let initial = json!({"content":"once","operation_id":"revoke:1"});
    exchange(
        f.client
            .put(format!("{origin}/api/vault/local/doc?id=once.md"))
            .bearer_auth(token)
            .json(&initial)
            .send()
            .await
            .unwrap(),
        200,
        "NoteWriteResponse",
    )
    .await;
    let revoked = f
        .client
        .delete(format!("{origin}/api/mobile/devices/{id}"))
        .header("x-api-key", MC_API_KEY.get().unwrap())
        .send()
        .await
        .unwrap();
    assert_eq!(revoked.status(), 200);
    for path in ["/api/mobile/capabilities", "/api/vault/local/documents"] {
        exchange(
            f.client
                .get(format!("{origin}{path}"))
                .bearer_auth(token)
                .send()
                .await
                .unwrap(),
            401,
            "ErrorResponse",
        )
        .await;
    }
    exchange(
        f.client
            .put(format!("{origin}/api/vault/local/doc?id=once.md"))
            .bearer_auth(token)
            .json(&initial)
            .send()
            .await
            .unwrap(),
        401,
        "ErrorResponse",
    )
    .await;
    // Models revocation after middleware authentication but before the write takes
    // its SQLite reservation: even an old principal cannot replay a receipt.
    let principal = crate::routes::mobile::NotesPrincipal {
        user_id: session(true).user_id.clone(),
        device_id: Some(id.into()),
    };
    assert!(matches!(
        super::note_write::put(&f.state, &principal, "once.md", initial).await,
        Err(AppError::Unauthorized)
    ));
    let other = second["data"]["token"].as_str().unwrap();
    exchange(
        f.client
            .get(format!("{origin}/api/mobile/capabilities"))
            .bearer_auth(other)
            .send()
            .await
            .unwrap(),
        200,
        "MobileCapabilitiesResponse",
    )
    .await;
    sqlx::query("UPDATE mobile_devices SET expires_at = 1 WHERE id = ?")
        .bind(second["data"]["device"]["id"].as_str().unwrap())
        .execute(&f.state.db)
        .await
        .unwrap();
    exchange(
        f.client
            .get(format!("{origin}/api/mobile/capabilities"))
            .bearer_auth(other)
            .send()
            .await
            .unwrap(),
        401,
        "ErrorResponse",
    )
    .await;
    assert_eq!(f.count("vault_note_write_receipts").await, 1);
    task.abort();
}

#[tokio::test]
async fn mobile_issuance_requires_verified_owner_and_revocation_is_owner_scoped() {
    let f = Fixture::new().await;
    for (owner, status) in [(None, 401), (Some(session(false)), 403)] {
        let (origin, task) = server(&f, owner).await;
        let response = f
            .client
            .post(format!("{origin}/api/mobile/devices"))
            .header("x-api-key", MC_API_KEY.get().unwrap())
            .json(&json!({"name":"phone"}))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status().as_u16(), status);
        task.abort();
    }
    let (origin, task) = server(&f, Some(session(true))).await;
    let issued = issue(&f, &origin).await;
    let mut other = session(true);
    other.user_id = "another-owner".into();
    let (different, different_task) = server(&f, Some(other)).await;
    exchange(
        f.client
            .delete(format!(
                "{different}/api/mobile/devices/{}",
                issued["data"]["device"]["id"].as_str().unwrap()
            ))
            .header("x-api-key", MC_API_KEY.get().unwrap())
            .send()
            .await
            .unwrap(),
        404,
        "ErrorResponse",
    )
    .await;
    for name in ["", "\n", &"x".repeat(81)] {
        exchange(
            f.client
                .post(format!("{origin}/api/mobile/devices"))
                .header("x-api-key", MC_API_KEY.get().unwrap())
                .json(&json!({"name":name}))
                .send()
                .await
                .unwrap(),
            400,
            "ErrorResponse",
        )
        .await;
    }
    assert_eq!(f.count("mobile_devices").await, 1);
    task.abort();
    different_task.abort();
}

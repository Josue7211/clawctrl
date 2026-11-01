//! Real HTTP handlers, full migrations, disposable SQLite. Auth extensions stand
//! in for the existing session middleware; remote pairing remains R05.
use super::*;
use crate::server::UserSession;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use std::{sync::Arc, time::Duration};
use tokio::{sync::RwLock, task::JoinHandle};

pub(super) struct Fixture {
    pub(super) _dir: tempfile::TempDir,
    pub(super) state: AppState,
    pub(super) client: reqwest::Client,
    pub(super) origin: String,
    pub(super) task: JoinHandle<()>,
}
impl Drop for Fixture {
    fn drop(&mut self) {
        self.task.abort();
    }
}
pub(super) fn session(mfa_verified: bool) -> UserSession {
    UserSession {
        access_token: "fixture-token".into(),
        refresh_token: "fixture-refresh".into(),
        user_id: "notes-contract-user".into(),
        email: "notes@example.test".into(),
        expires_at: i64::MAX,
        encryption_key: vec![],
        mfa_verified,
        factor_id: None,
        factor_type: None,
        available_mfa_methods: vec![],
        created_at: 1,
    }
}
async fn serve(state: AppState, auth: Option<UserSession>) -> (String, JoinHandle<()>) {
    let app = Router::new().nest("/api", router()).with_state(state);
    let app = if let Some(auth) = auth {
        app.layer(axum::Extension(auth))
    } else {
        app
    };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (origin, task)
}
impl Fixture {
    pub(super) async fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let options = SqliteConnectOptions::new()
            .filename(dir.path().join("notes.sqlite"))
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(5));
        let db = SqlitePoolOptions::new()
            .max_connections(4)
            .connect_with(options)
            .await
            .unwrap();
        sqlx::migrate::Migrator::new(
            FsPath::new(env!("CARGO_MANIFEST_DIR"))
                .join("migrations")
                .as_path(),
        )
        .await
        .unwrap()
        .run(&db)
        .await
        .unwrap();
        let state = AppState {
            app: None,
            db,
            http: reqwest::Client::new(),
            secrets: Arc::new(std::sync::RwLock::new(Default::default())),
            bb: None,
            harness: None,
            gateway_ws: None,
            session: Arc::new(RwLock::new(None)),
            refresh_mutex: Arc::new(tokio::sync::Mutex::new(())),
            session_validated_at: Arc::new(RwLock::new(0)),
            pending_oauth: Arc::new(RwLock::new(None)),
        };
        let (origin, task) = serve(state.clone(), Some(session(true))).await;
        Self {
            _dir: dir,
            state,
            client: reqwest::Client::new(),
            origin,
            task,
        }
    }
    pub(super) fn url(&self, id: &str) -> reqwest::Url {
        let mut url = reqwest::Url::parse(&format!("{}/api/vault/local/doc", self.origin)).unwrap();
        url.query_pairs_mut().append_pair("id", id);
        url
    }
    pub(super) async fn put(&self, id: &str, body: Value, status: u16) -> Value {
        exchange(
            self.client
                .put(self.url(id))
                .json(&body)
                .send()
                .await
                .unwrap(),
            status,
            if status == 200 {
                "NoteWriteResponse"
            } else {
                "ErrorResponse"
            },
        )
        .await
    }
    pub(super) async fn read(&self, id: &str) -> Value {
        exchange(
            self.client.get(self.url(id)).send().await.unwrap(),
            200,
            "NoteReadResponse",
        )
        .await
    }
    pub(super) async fn count(&self, table: &str) -> i64 {
        sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {table}"))
            .fetch_one(&self.state.db)
            .await
            .unwrap()
    }
}
pub(super) async fn exchange(response: reqwest::Response, status: u16, schema: &str) -> Value {
    let actual = response.status().as_u16();
    let text = response.text().await.unwrap();
    assert_eq!(actual, status, "unexpected response: {text}");
    let body: Value = serde_json::from_str(&text).unwrap();
    let validator = crate::notes_contract::validator(schema);
    assert!(
        validator.is_valid(&body),
        "{schema}: {body}: {:?}",
        validator.iter_errors(&body).collect::<Vec<_>>()
    );
    body
}

#[tokio::test]
async fn notes_contract_create_list_read_and_encoded_alias_agree() {
    let f = Fixture::new().await;
    let id = "Workspace/Café + ? # 雪.md";
    let created = f.put(id, json!({"content":"# Hello", "title":"Café", "tags":["sample"],"properties":{"owner":"fixture"}}), 200).await;
    let note = f.read(id).await;
    assert_eq!(note["data"]["_id"], id);
    assert_eq!(note["data"]["_rev"], created["data"]["rev"]);
    assert_eq!(note["data"]["content"], "# Hello");
    let list = exchange(
        f.client
            .get(format!("{}/api/vault/local/documents", f.origin))
            .send()
            .await
            .unwrap(),
        200,
        "NoteListResponse",
    )
    .await;
    assert_eq!(list["data"]["notes"], json!([note["data"]]));
    let mut alias = reqwest::Url::parse(&f.origin).unwrap();
    alias
        .path_segments_mut()
        .unwrap()
        .extend(["api", "vault", "local", "documents", id]);
    let alias_read = exchange(
        f.client.get(alias.clone()).send().await.unwrap(),
        200,
        "NoteReadResponse",
    )
    .await;
    assert_eq!(alias_read, note);
    exchange(
        f.client
            .put(alias)
            .json(&json!({"content":"alias update","_rev":created["data"]["rev"]}))
            .send()
            .await
            .unwrap(),
        200,
        "NoteWriteResponse",
    )
    .await;
    assert_eq!(f.read(id).await["data"]["content"], "alias update");
    assert_eq!(f.count("vault_versions").await, 1);
    assert_eq!(f.count("vault_documents_fts").await, 1);
    exchange(
        f.client.get(f.url("missing.md")).send().await.unwrap(),
        404,
        "ErrorResponse",
    )
    .await;
    // Negative drift proof: an actual response with its revision removed fails.
    let mut incompatible = note;
    incompatible["data"].as_object_mut().unwrap().remove("_rev");
    assert!(!crate::notes_contract::validator("NoteReadResponse").is_valid(&incompatible));
}

#[tokio::test]
async fn notes_contract_invalid_requests_cannot_create_notes() {
    let f = Fixture::new().await;
    for (id, body) in [
        ("", json!({"content":"x"})),
        ("../bad", json!({"content":"x"})),
        ("_private", json!({"content":"x"})),
        (" ", json!({"content":"x"})),
        ("note", json!({})),
        ("note", json!({"content":12})),
        ("note", json!({"content":"x","_id":"other"})),
        ("note", json!({"content":"x","tags":[12]})),
        (
            "note",
            json!({"content":"x","operation_id":"contains space"}),
        ),
    ] {
        f.put(id, body, 400).await;
    }
    f.put("missing", json!({"content":"x","_rev":"local-1"}), 409)
        .await;
    assert_eq!(f.count("vault_documents").await, 0);
    assert_eq!(f.count("vault_audit_log").await, 0);
}

#[tokio::test]
async fn notes_contract_concurrent_writes_have_one_winner() {
    let f = Fixture::new().await;
    let create = f.put("same.md", json!({"content":"initial"}), 200).await;
    f.put("same.md", json!({"content":"unconditional"}), 409)
        .await;
    let rev = &create["data"]["rev"];
    let a = f
        .client
        .put(f.url("same.md"))
        .json(&json!({"content":"A","_rev":rev}))
        .send();
    let b = f
        .client
        .put(f.url("same.md"))
        .json(&json!({"content":"B","_rev":rev}))
        .send();
    let (a, b) = tokio::join!(a, b);
    let a = a.unwrap();
    let b = b.unwrap();
    let statuses = [a.status().as_u16(), b.status().as_u16()];
    assert!(
        statuses == [200, 409] || statuses == [409, 200],
        "{statuses:?}"
    );
    for response in [a, b] {
        let status = response.status().as_u16();
        exchange(
            response,
            status,
            if status == 200 {
                "NoteWriteResponse"
            } else {
                "ErrorResponse"
            },
        )
        .await;
    }
    let current = f.read("same.md").await;
    assert_ne!(current["data"]["_rev"], *rev);
    f.put("same.md", json!({"content":"stale","_rev":rev}), 409)
        .await;
    assert_eq!(f.count("vault_audit_log").await, 2);
}

#[tokio::test]
async fn notes_contract_receipts_survive_restart_and_never_reapply_old_writes() {
    let mut f = Fixture::new().await;
    let body = json!({"content":"captured once","operation_id":"capture:fixture-1"});
    let first = f.put("capture.md", body.clone(), 200).await;
    let (a, b) = tokio::join!(
        f.put("capture.md", body.clone(), 200),
        f.put("capture.md", body.clone(), 200)
    );
    assert_eq!(a, first);
    assert_eq!(b, first);
    assert_eq!(f.count("vault_versions").await, 1);
    assert_eq!(f.count("vault_audit_log").await, 1);
    let edited = f.put("capture.md", json!({"content":"later edit","_rev":first["data"]["rev"],"operation_id":"edit:fixture-2"}),200).await;
    f.task.abort();
    let _ = (&mut f.task).await;
    // Close and reopen the SQLite pool as well as the HTTP server.
    f.state.db.close().await;
    f.state.db = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(
            SqliteConnectOptions::new()
                .filename(f._dir.path().join("notes.sqlite"))
                .busy_timeout(Duration::from_secs(5)),
        )
        .await
        .unwrap();
    let (origin, task) = serve(f.state.clone(), Some(session(true))).await;
    f.origin = origin;
    f.task = task;
    assert_eq!(f.put("capture.md", body.clone(), 200).await, first);
    let note = f.read("capture.md").await;
    assert_eq!(note["data"]["content"], "later edit");
    assert_eq!(note["data"]["_rev"], edited["data"]["rev"]);
    f.put("other.md", body.clone(), 409).await;
    f.put(
        "capture.md",
        json!({"content":"different","operation_id":"capture:fixture-1"}),
        409,
    )
    .await;
    assert_eq!(
        f.client
            .delete(f.url("capture.md"))
            .send()
            .await
            .unwrap()
            .status(),
        200
    );
    assert_eq!(f.put("capture.md", body, 200).await, first);
    exchange(
        f.client.get(f.url("capture.md")).send().await.unwrap(),
        404,
        "ErrorResponse",
    )
    .await;
}

#[tokio::test]
async fn notes_contract_receipt_and_all_side_effects_roll_back_on_failure() {
    let f = Fixture::new().await;
    sqlx::query("CREATE TRIGGER fail_receipt BEFORE INSERT ON vault_note_write_receipts BEGIN SELECT RAISE(ABORT, 'fixture receipt failure'); END")
        .execute(&f.state.db)
        .await
        .unwrap();
    f.put(
        "New/Child/test.md",
        json!({"content":"never committed","operation_id":"rollback:1"}),
        500,
    )
    .await;
    for table in [
        "vault_documents",
        "vault_documents_fts",
        "vault_folders",
        "vault_versions",
        "vault_audit_log",
        "vault_note_write_receipts",
    ] {
        assert_eq!(f.count(table).await, 0, "{table} escaped rollback");
    }
}

#[tokio::test]
async fn notes_contract_auth_rejections_preserve_existing_text_protocol() {
    let f = Fixture::new().await;
    for (auth, status, body) in [
        (None, 401, "Authentication required"),
        (Some(session(false)), 403, "MFA verification required"),
    ] {
        let (origin, task) = serve(f.state.clone(), auth).await;
        let response = f
            .client
            .put(format!("{origin}/api/vault/local/doc?id=private.md"))
            .json(&json!({"content":"forbidden"}))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status().as_u16(), status);
        assert!(response.headers()["content-type"]
            .to_str()
            .unwrap()
            .starts_with("text/plain"));
        assert_eq!(response.text().await.unwrap(), body);
        task.abort();
    }
    assert_eq!(f.count("vault_documents").await, 0);
}

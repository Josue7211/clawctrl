//! Development restart persistence. SQLite holds authenticated ciphertext only;
//! the wrapping key belongs to the OS credential store, never env or frontend IPC.

use crate::server::UserSession;
use anyhow::{anyhow, ensure, Result};
use rand::RngCore;
use sqlx::SqlitePool;
use zeroize::Zeroizing;

const WRAPPING_KEY: &str = "auth.dev-session-wrapping-key.v1";
static STORE_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// Discard legacy plaintext sessions without deserializing their credentials.
/// Run in release builds too, so upgrading never retains the old debug row.
pub(crate) async fn initialize(db: &SqlitePool) -> Result<()> {
    let mut conn = db.acquire().await?;
    let legacy: Option<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_dev_session'",
    )
    .fetch_optional(&mut *conn)
    .await?;
    if legacy.is_some() {
        sqlx::query("PRAGMA secure_delete=ON")
            .execute(&mut *conn)
            .await?;
        sqlx::query("DROP TABLE IF EXISTS _dev_session")
            .execute(&mut *conn)
            .await?;
        tracing::info!("discarded legacy development session; sign in again");
    }
    // Retry checkpointing even if an earlier startup stopped after dropping the
    // legacy table. Old WAL frames must not survive a partially completed purge.
    let checkpoint: (i64, i64, i64) = sqlx::query_as("PRAGMA wal_checkpoint(TRUNCATE)")
        .fetch_one(&mut *conn)
        .await?;
    ensure!(checkpoint.0 == 0, "legacy session cleanup needs a retry");
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _dev_session_secure (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            ciphertext TEXT NOT NULL,
            nonce TEXT NOT NULL
        )",
    )
    .execute(&mut *conn)
    .await?;
    Ok(())
}

pub(crate) async fn clear(db: &SqlitePool) -> Result<()> {
    let _guard = STORE_LOCK.lock().await;
    sqlx::query("DELETE FROM _dev_session_secure")
        .execute(db)
        .await?;
    Ok(())
}

trait KeyStore {
    fn get(&self) -> Option<Zeroizing<String>>;
    fn set(&self, value: &str) -> Result<()>;
}

struct OsKeyStore<'a>(&'a str);

impl KeyStore for OsKeyStore<'_> {
    fn get(&self) -> Option<Zeroizing<String>> {
        crate::secrets::get_protected_entry(self.0).map(Zeroizing::new)
    }

    fn set(&self, value: &str) -> Result<()> {
        crate::secrets::set_protected_entry(self.0, value)
            .map_err(|_| anyhow!("protected session storage unavailable"))
    }
}

fn wrapping_key(store: &impl KeyStore, create: bool) -> Result<Zeroizing<Vec<u8>>> {
    if let Some(encoded) = store.get() {
        if let Ok(key) = hex::decode(encoded.as_str()) {
            let key = Zeroizing::new(key);
            if key.len() == 32 {
                return Ok(key);
            }
        }
        ensure!(create, "invalid session wrapping key");
    }
    ensure!(create, "protected session storage unavailable");
    let mut key = Zeroizing::new(vec![0u8; 32]);
    rand::thread_rng().fill_bytes(key.as_mut_slice());
    let encoded = Zeroizing::new(hex::encode(key.as_slice()));
    store.set(encoded.as_str())?;
    Ok(key)
}

async fn os_key(create: bool) -> Result<Zeroizing<Vec<u8>>> {
    tokio::task::spawn_blocking(move || wrapping_key(&OsKeyStore(WRAPPING_KEY), create))
        .await
        .map_err(|_| anyhow!("protected session storage unavailable"))?
}

pub(crate) async fn save(db: &SqlitePool, session: &UserSession) -> Result<()> {
    let _guard = STORE_LOCK.lock().await;
    save_with_key(db, session, os_key(true).await).await
}

async fn save_with_key(
    db: &SqlitePool,
    session: &UserSession,
    key: Result<Zeroizing<Vec<u8>>>,
) -> Result<()> {
    // Retire the previous snapshot even if protected key lookup failed.
    // A failed save must not leave an older authenticated snapshot to restore.
    sqlx::query("DELETE FROM _dev_session_secure")
        .execute(db)
        .await?;
    let key = key?;
    let plaintext = Zeroizing::new(serde_json::to_vec(session)?);
    let (ciphertext, nonce) = crate::crypto::encrypt(&plaintext, &key)?;
    sqlx::query("INSERT INTO _dev_session_secure (id, ciphertext, nonce) VALUES (1, ?, ?)")
        .bind(ciphertext)
        .bind(nonce)
        .execute(db)
        .await?;
    Ok(())
}

pub(crate) async fn restore(db: &SqlitePool) -> Result<Option<UserSession>> {
    let _guard = STORE_LOCK.lock().await;
    let row: Option<(String, String)> =
        sqlx::query_as("SELECT ciphertext, nonce FROM _dev_session_secure WHERE id = 1")
            .fetch_optional(db)
            .await?;
    let Some(row) = row else { return Ok(None) };
    restore_with_key(db, row, os_key(false).await).await
}

async fn restore_with_key(
    db: &SqlitePool,
    (ciphertext, nonce): (String, String),
    key: Result<Zeroizing<Vec<u8>>>,
) -> Result<Option<UserSession>> {
    let decoded = key.and_then(|key| {
        let plaintext = Zeroizing::new(crate::crypto::decrypt(&ciphertext, &nonce, &key)?);
        let session: UserSession = serde_json::from_slice(&plaintext)?;
        let age = crate::server::epoch_secs().checked_sub(session.created_at);
        ensure!(
            age.is_some_and(|age| (0..86_400).contains(&age)),
            "development session expired"
        );
        ensure!(
            !session.access_token.is_empty() && !session.refresh_token.is_empty(),
            "development session has no credentials"
        );
        Ok(session)
    });
    match decoded {
        Ok(session) => Ok(Some(session)),
        Err(_) => {
            sqlx::query("DELETE FROM _dev_session_secure")
                .execute(db)
                .await?;
            tracing::warn!("protected development session unavailable; sign in again");
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    #[derive(Default)]
    struct FakeKeyStore {
        value: Mutex<Option<Zeroizing<String>>>,
        unavailable: bool,
    }

    impl KeyStore for FakeKeyStore {
        fn get(&self) -> Option<Zeroizing<String>> {
            if self.unavailable {
                None
            } else {
                self.value.lock().unwrap().clone()
            }
        }
        fn set(&self, value: &str) -> Result<()> {
            ensure!(!self.unavailable, "credential store unavailable");
            *self.value.lock().unwrap() = Some(Zeroizing::new(value.to_owned()));
            Ok(())
        }
    }

    pub(crate) fn session() -> UserSession {
        UserSession {
            access_token: "fixture-only-access-credential-9b1037".into(),
            refresh_token: "fixture-only-refresh-credential-a71b9d".into(),
            user_id: "r01-fixture-user".into(),
            email: "r01@example.test".into(),
            expires_at: crate::server::epoch_secs() + 3600,
            encryption_key: vec![0x42; 32],
            mfa_verified: true,
            factor_id: None,
            factor_type: None,
            available_mfa_methods: vec![],
            created_at: crate::server::epoch_secs(),
        }
    }

    async fn db() -> SqlitePool {
        let db = SqlitePool::connect("sqlite::memory:").await.unwrap();
        initialize(&db).await.unwrap();
        db
    }

    fn key() -> Result<Zeroizing<Vec<u8>>> {
        Ok(Zeroizing::new(vec![0x37; 32]))
    }

    async fn row(db: &SqlitePool) -> (String, String) {
        sqlx::query_as("SELECT ciphertext, nonce FROM _dev_session_secure WHERE id=1")
            .fetch_one(db)
            .await
            .unwrap()
    }

    async fn count(db: &SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT count(*) FROM _dev_session_secure")
            .fetch_one(db)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn encrypted_session_survives_database_restart_without_plaintext() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("fixture.db");
        let url = format!("sqlite://{}?mode=rwc", path.display());
        let db = SqlitePool::connect(&url).await.unwrap();
        initialize(&db).await.unwrap();
        let session = session();
        save_with_key(&db, &session, key()).await.unwrap();
        db.close().await;
        let bytes = std::fs::read(&path).unwrap();
        let account_key = serde_json::to_string(&session.encryption_key).unwrap();
        for secret in [
            &session.access_token,
            &session.refresh_token,
            &hex::encode([0x37; 32]),
            &account_key,
        ] {
            assert!(!bytes.windows(secret.len()).any(|w| w == secret.as_bytes()));
        }
        let db = SqlitePool::connect(&url).await.unwrap();
        let restored = restore_with_key(&db, row(&db).await, key())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(restored, session);
        clear(&db).await.unwrap();
        db.close().await;
        let db = SqlitePool::connect(&url).await.unwrap();
        assert!(restore(&db).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn unavailable_credential_store_never_falls_back_to_plaintext() {
        let db = db().await;
        save_with_key(&db, &session(), key()).await.unwrap();
        let unavailable = FakeKeyStore {
            unavailable: true,
            ..Default::default()
        };
        assert!(
            save_with_key(&db, &session(), wrapping_key(&unavailable, true))
                .await
                .is_err()
        );
        assert_eq!(count(&db).await, 0);
        save_with_key(&db, &session(), key()).await.unwrap();
        assert!(
            restore_with_key(&db, row(&db).await, wrapping_key(&unavailable, false))
                .await
                .unwrap()
                .is_none()
        );
        assert_eq!(count(&db).await, 0);
    }

    #[tokio::test]
    async fn corrupt_expired_and_future_sessions_are_discarded() {
        let db = db().await;
        for created_at in [crate::server::epoch_secs() - 86_400, i64::MIN, i64::MAX] {
            let mut old = session();
            old.created_at = created_at;
            save_with_key(&db, &old, key()).await.unwrap();
            assert!(restore_with_key(&db, row(&db).await, key())
                .await
                .unwrap()
                .is_none());
            assert_eq!(count(&db).await, 0);
        }
        save_with_key(&db, &session(), key()).await.unwrap();
        assert!(
            restore_with_key(&db, row(&db).await, Ok(Zeroizing::new(vec![9; 32])))
                .await
                .unwrap()
                .is_none()
        );
        save_with_key(&db, &session(), key()).await.unwrap();
        sqlx::query("UPDATE _dev_session_secure SET nonce='invalid'")
            .execute(&db)
            .await
            .unwrap();
        assert!(restore_with_key(&db, row(&db).await, key())
            .await
            .unwrap()
            .is_none());
        assert_eq!(count(&db).await, 0);
    }

    #[tokio::test]
    async fn legacy_plaintext_is_scrubbed_and_never_restored() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("legacy.db");
        let db = SqlitePool::connect(&format!("sqlite://{}?mode=rwc", path.display()))
            .await
            .unwrap();
        sqlx::query("PRAGMA journal_mode=WAL")
            .execute(&db)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE _dev_session (id INTEGER PRIMARY KEY, data TEXT, created_at INTEGER)",
        )
        .execute(&db)
        .await
        .unwrap();
        sqlx::query("INSERT INTO _dev_session VALUES (1, ?, 0)")
            .bind(serde_json::to_string(&session()).unwrap())
            .execute(&db)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE notes (body TEXT)")
            .execute(&db)
            .await
            .unwrap();
        sqlx::query("INSERT INTO notes VALUES ('keep this note')")
            .execute(&db)
            .await
            .unwrap();
        initialize(&db).await.unwrap();
        let legacy: i64 =
            sqlx::query_scalar("SELECT count(*) FROM sqlite_master WHERE name='_dev_session'")
                .fetch_one(&db)
                .await
                .unwrap();
        assert_eq!(legacy, 0);
        assert!(restore(&db).await.unwrap().is_none());
        let note: String = sqlx::query_scalar("SELECT body FROM notes")
            .fetch_one(&db)
            .await
            .unwrap();
        assert_eq!(note, "keep this note");
        db.close().await;
        for path in [path.clone(), path.with_extension("db-wal")] {
            if let Ok(bytes) = std::fs::read(path) {
                for secret in [&session().access_token, &session().refresh_token] {
                    assert!(!bytes.windows(secret.len()).any(|w| w == secret.as_bytes()));
                }
            }
        }
    }

    #[test]
    fn wrapping_key_is_reused_and_inaccessible_to_frontend_commands() {
        let store = FakeKeyStore::default();
        let first = wrapping_key(&store, true).unwrap();
        assert_eq!(first, wrapping_key(&store, false).unwrap());
        assert_eq!(first.len(), 32);
        assert!(crate::secrets::get_secret(WRAPPING_KEY.into()).is_none());
        assert!(crate::secrets::set_secret(WRAPPING_KEY.into(), "untrusted".into()).is_err());
    }

    #[test]
    fn a_corrupt_wrapping_key_requires_login_then_can_be_replaced() {
        let store = FakeKeyStore::default();
        store.set("invalid-key").unwrap();
        assert!(wrapping_key(&store, false).is_err());
        let fresh = wrapping_key(&store, true).unwrap();
        assert_eq!(fresh, wrapping_key(&store, false).unwrap());
    }

    #[test]
    #[ignore = "requires an available OS credential store; creates and deletes only a disposable entry"]
    fn os_credential_store_roundtrip() {
        let name = format!("r01-test-{}", hex::encode(rand::random::<[u8; 16]>()));
        struct Cleanup(String);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                if let Ok(entry) = keyring::Entry::new("com.clawctrl.desktop", &self.0) {
                    let _ = entry.delete_credential();
                }
            }
        }
        let _cleanup = Cleanup(name.clone());
        let store = OsKeyStore(&name);
        let first = wrapping_key(&store, true).expect("OS credential store write failed");
        assert_eq!(
            first,
            wrapping_key(&store, false).expect("OS credential store read failed")
        );
    }
}

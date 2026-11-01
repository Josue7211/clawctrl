//! Offline-first sync engine: pushes local mutations to Supabase and pulls
//! remote changes into local SQLite. Runs as a background tokio task on a
//! 30-second interval. Skips cycles when Supabase is unreachable.
//!
//! Conflict resolution: **local wins**. If a row has unsynced local changes
//! when a remote update arrives, the remote update is logged to `_conflict_log`
//! and skipped — the local version will be pushed on the next cycle.

use serde_json::Value;
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use crate::server::UserSession;
use crate::supabase::SupabaseClient;

/// Generated module tables keep the legacy SQLite names for compatibility.
const GENERATED_MODULE_TABLE: &str = "generated_modules";
const GENERATED_MODULE_VERSION_TABLE: &str = "generated_module_versions";

/// Tables to sync between local SQLite and remote Supabase.
const SYNC_TABLES: &[&str] = &[
    "todos",
    "missions",
    "mission_events",
    "agents",
    "ideas",
    "captures",
    "habits",
    "habit_entries",
    "user_preferences",
    "changelog_entries",
    "decisions",
    "knowledge_entries",
    "daily_reviews",
    "weekly_reviews",
    "retrospectives",
    "workflow_notes",
    "cache",
    GENERATED_MODULE_TABLE,
    GENERATED_MODULE_VERSION_TABLE,
];

fn sync_cursor_column(table: &str) -> &'static str {
    match table {
        GENERATED_MODULE_VERSION_TABLE => "created_at",
        _ => "updated_at",
    }
}

/// Background sync engine that keeps local SQLite in sync with Supabase.
pub struct SyncEngine {
    db: SqlitePool,
    supabase_url: String,
    service_key: String,
    session: Arc<RwLock<Option<UserSession>>>,
}

impl SyncEngine {
    pub fn new(
        db: SqlitePool,
        supabase_url: String,
        service_key: String,
        session: Arc<RwLock<Option<UserSession>>>,
    ) -> Self {
        Self {
            db,
            supabase_url,
            service_key,
            session,
        }
    }

    /// Start the background sync loop. Runs push+pull every 30 seconds.
    /// Reads the JWT from the shared session on each cycle (handles token
    /// refresh transparently).
    pub fn start(self) {
        tokio::spawn(async move {
            // Wait a few seconds for the app to settle before first sync
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;

            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
            loop {
                interval.tick().await;

                // Read current JWT from the shared session
                let jwt = {
                    let guard = self.session.read().await;
                    match guard.as_ref() {
                        Some(s) if s.mfa_verified => s.access_token.clone(),
                        Some(_) => {
                            debug!("sync: MFA not verified, skipping");
                            continue;
                        }
                        None => {
                            debug!("sync: no active session, skipping cycle");
                            continue;
                        }
                    }
                };

                if let Err(e) = self.sync_cycle(&jwt).await {
                    warn!("sync cycle failed: {e}");
                }
            }
        });
    }

    async fn sync_cycle(&self, jwt: &str) -> anyhow::Result<()> {
        if self.supabase_url.is_empty() || self.service_key.is_empty() {
            debug!("sync: supabase not configured, skipping");
            return Ok(());
        }

        // Check if Supabase is reachable
        let client = SupabaseClient::new(&self.supabase_url, &self.service_key);
        if !client.health_check().await {
            debug!("sync: supabase unreachable, skipping cycle");
            return Ok(());
        }

        self.push(&client, jwt).await?;
        self.pull(&client, jwt).await?;
        Ok(())
    }

    /// Push local changes (from `_sync_log`) to Supabase.
    async fn push(&self, client: &SupabaseClient, jwt: &str) -> anyhow::Result<()> {
        // synced_at: NULL = pending, >0 = synced, -1 = permanently failed (schema mismatch)
        let pending: Vec<(i64, String, String, String, Option<String>)> = sqlx::query_as(
            "SELECT id, table_name, row_id, operation, payload \
             FROM _sync_log WHERE synced_at IS NULL ORDER BY id",
        )
        .fetch_all(&self.db)
        .await?;

        if pending.is_empty() {
            return Ok(());
        }

        info!("sync: pushing {} pending changes", pending.len());

        for (log_id, table, row_id, operation, payload) in &pending {
            // Validate table name against allowlist
            if !SYNC_TABLES.contains(&table.as_str()) {
                warn!("sync: unsupported table {table}; keeping pending mutation {log_id}");
                continue;
            }

            // Validate row_id — reject PostgREST injection characters
            if row_id.is_empty()
                || row_id.contains('&')
                || row_id.contains('=')
                || row_id.contains('(')
                || row_id.contains(')')
                || row_id.contains(';')
                || row_id.contains('.')
                || row_id.contains(',')
            {
                warn!("sync: invalid row ID; keeping pending mutation {log_id} for {table}");
                continue;
            }

            let result = match operation.as_str() {
                "INSERT" | "UPDATE" => {
                    if let Some(data) = payload {
                        let body: Value = match serde_json::from_str(data) {
                            Ok(body) => body,
                            Err(_) => {
                                // A bad entry must neither be acknowledged nor
                                // prevent unrelated valid entries from uploading.
                                warn!("sync: malformed payload; keeping pending mutation {log_id} for {table}");
                                continue;
                            }
                        };
                        client.upsert_as_user(table, body, jwt).await.map(|_| ())
                    } else {
                        continue;
                    }
                }
                "DELETE" => {
                    client
                        .delete_as_user(table, &format!("id=eq.{}", row_id), jwt)
                        .await
                }
                _ => continue,
            };

            match result {
                Ok(_) => {
                    sqlx::query("UPDATE _sync_log SET synced_at = unixepoch() WHERE id = ?")
                        .bind(log_id)
                        .execute(&self.db)
                        .await?;
                }
                Err(e) => {
                    let err_str = e.to_string();
                    // 400 Bad Request = schema mismatch, won't self-heal — stop retrying
                    if err_str.contains("400 Bad Request") {
                        warn!("sync push permanently failed for {table}/{row_id} (schema mismatch): {e}");
                        sqlx::query("UPDATE _sync_log SET synced_at = -1 WHERE id = ?")
                            .bind(log_id)
                            .execute(&self.db)
                            .await?;
                    } else {
                        warn!("sync push failed for {table}/{row_id}: {e}");
                        // Don't mark as synced — will retry next cycle
                    }
                }
            }
        }

        Ok(())
    }

    /// Pull remote changes from Supabase into local SQLite.
    async fn pull(&self, client: &SupabaseClient, jwt: &str) -> anyhow::Result<()> {
        for table in SYNC_TABLES {
            if let Err(e) = self.pull_table(client, jwt, table).await {
                warn!("sync pull failed for {table}: {e}");
            }
        }
        Ok(())
    }

    async fn pull_table(
        &self,
        client: &SupabaseClient,
        jwt: &str,
        table: &str,
    ) -> anyhow::Result<()> {
        let last_synced: Option<String> =
            sqlx::query_scalar("SELECT last_synced_at FROM _sync_state WHERE table_name = ?")
                .bind(table)
                .fetch_optional(&self.db)
                .await?
                .flatten();

        let cursor_column = sync_cursor_column(table);
        let query = match &last_synced {
            Some(ts) => {
                // Validate timestamp format before interpolating into PostgREST query
                let safe_ts = ts.replace(' ', "T").replace('+', "%2B");
                if !safe_ts
                    .chars()
                    .all(|c| c.is_ascii_digit() || "-T:.%BZ".contains(c))
                {
                    warn!("sync: invalid last_synced_at for {table}: {ts}");
                    format!("select=*&order={cursor_column}.asc&limit=500")
                } else {
                    format!(
                        "select=*&{cursor_column}=gt.{safe_ts}&order={cursor_column}.asc&limit=500",
                    )
                }
            }
            None => format!("select=*&order={cursor_column}.asc&limit=500"),
        };

        let rows = client.select_as_user(table, &query, jwt).await?;
        let rows = match rows.as_array() {
            Some(arr) if !arr.is_empty() => arr,
            _ => return Ok(()),
        };

        debug!("sync: pulling {} rows for {table}", rows.len());

        for row in rows {
            let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if id.is_empty() {
                continue;
            }

            // Check for conflict: does local have a pending unsynced change for this row?
            let has_pending: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM _sync_log \
                 WHERE table_name = ? AND row_id = ? AND synced_at IS NULL",
            )
            .bind(table)
            .bind(id)
            .fetch_one(&self.db)
            .await?;

            if has_pending {
                // Conflict: local has unsynced changes. Log it, let local win.
                let local_json: Option<String> = sqlx::query_scalar(&format!(
                "SELECT json_object('id', id, '{cursor_column}', {cursor_column}) FROM {table} WHERE id = ?"
            ))
                .bind(id)
                .fetch_optional(&self.db)
                .await?
                .flatten();

                sqlx::query(
                    "INSERT INTO _conflict_log (table_name, row_id, local_data, remote_data, resolution) \
                     VALUES (?, ?, ?, ?, 'local_wins')",
                )
                .bind(table)
                .bind(id)
                .bind(&local_json)
                .bind(serde_json::to_string(row).unwrap_or_default())
                .execute(&self.db)
                .await?;

                debug!("sync: conflict on {table}/{id} - local wins");
                continue;
            }

            // Check if soft-deleted remotely
            let deleted_at = row
                .get("deleted_at")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty());

            if deleted_at.is_some() {
                // Soft-deleted remotely — hard-delete locally
                sqlx::query(&format!("DELETE FROM \"{table}\" WHERE id = ?"))
                    .bind(id)
                    .execute(&self.db)
                    .await?;
            } else {
                // Upsert into local SQLite with full column mapping for tables
                // that are read locally (offline-first).
                self.upsert_row(table, row).await?;
            }
        }

        // Update sync cursor
        if let Some(last_row) = rows.last() {
            let ts = last_row
                .get(cursor_column)
                .and_then(|v| v.as_str())
                .unwrap_or("");
            sqlx::query(
                "INSERT INTO _sync_state (table_name, last_synced_at) VALUES (?, ?) \
                 ON CONFLICT(table_name) DO UPDATE SET last_synced_at = excluded.last_synced_at",
            )
            .bind(table)
            .bind(ts)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Upsert a row from Supabase into local SQLite.
    ///
    /// Tables that are read locally (offline-first) get full column mapping.
    /// All other tables fall back to the minimal (id, user_id, updated_at) upsert
    /// which is enough for sync metadata tracking.
    async fn upsert_row(&self, table: &str, row: &Value) -> anyhow::Result<()> {
        match table {
            "mission_events" => self.upsert_mission_event(row).await,
            _ => self.upsert_generic(table, row).await,
        }
    }

    /// Generic upsert: dynamically maps columns from the Supabase row
    /// into the local SQLite table, filtering to only columns that exist locally.
    async fn upsert_generic(&self, table: &str, row: &Value) -> anyhow::Result<()> {
        let obj = match row.as_object() {
            Some(o) if !o.is_empty() => o,
            _ => return Ok(()),
        };

        // Query local SQLite for which columns actually exist in this table
        let local_cols: Vec<String> = sqlx::query_scalar::<_, String>(&format!(
            "SELECT name FROM pragma_table_info('{table}')"
        ))
        .fetch_all(&self.db)
        .await
        .unwrap_or_default();

        let local_col_set: std::collections::HashSet<&str> =
            local_cols.iter().map(|s| s.as_str()).collect();

        // Only include columns that exist in both Supabase row AND local table
        let columns: Vec<&str> = obj
            .keys()
            .map(|k| k.as_str())
            .filter(|k| local_col_set.contains(k))
            .collect();

        if columns.is_empty() || !columns.contains(&"id") {
            return Ok(());
        }

        // Quote column names with double-quotes to prevent SQL injection
        let columns_quoted: Vec<String> = columns.iter().map(|c| format!("\"{}\"", c)).collect();
        let placeholders: Vec<&str> = columns.iter().map(|_| "?").collect();
        let updates: Vec<String> = columns
            .iter()
            .filter(|c| **c != "id")
            .map(|c| format!("\"{}\" = excluded.\"{}\"", c, c))
            .collect();

        let sql = format!(
            "INSERT INTO \"{table}\" ({cols}) VALUES ({phs}) ON CONFLICT(id) DO UPDATE SET {upd}",
            cols = columns_quoted.join(", "),
            phs = placeholders.join(", "),
            upd = if updates.is_empty() {
                "\"id\" = excluded.\"id\"".to_string()
            } else {
                updates.join(", ")
            },
        );

        let mut query = sqlx::query(&sql);
        for col in &columns {
            let val = &obj[*col];
            match val {
                Value::String(s) => query = query.bind(s.clone()),
                Value::Number(n) => query = query.bind(n.to_string()),
                Value::Bool(b) => {
                    query = query.bind(if *b { "1".to_string() } else { "0".to_string() })
                }
                Value::Null => query = query.bind(None::<String>),
                _ => query = query.bind(val.to_string()),
            }
        }

        query.execute(&self.db).await?;
        Ok(())
    }

    /// Full-column upsert for mission_events (read locally for offline access).
    async fn upsert_mission_event(&self, row: &Value) -> anyhow::Result<()> {
        let str_field = |key| row.get(key).and_then(|v| v.as_str()).unwrap_or("");
        let opt_str = |key| row.get(key).and_then(|v| v.as_str()).map(|s| s.to_string());

        let id = str_field("id");
        let user_id = str_field("user_id");
        let mission_id = str_field("mission_id");
        let seq = row.get("seq").and_then(|v| v.as_i64()).unwrap_or(0);
        let event_type = str_field("event_type");
        let content = str_field("content");
        let file_path = opt_str("file_path");
        let tool_input = opt_str("tool_input");
        let tool_output = opt_str("tool_output");
        let model_name = opt_str("model_name");
        let elapsed_seconds: Option<f64> = row.get("elapsed_seconds").and_then(|v| v.as_f64());
        let created_at = str_field("created_at");
        let updated_at = str_field("updated_at");

        sqlx::query(
            "INSERT INTO mission_events \
             (id, user_id, mission_id, seq, event_type, content, file_path, \
              tool_input, tool_output, model_name, elapsed_seconds, created_at, updated_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(id) DO UPDATE SET \
               seq = excluded.seq, \
               event_type = excluded.event_type, \
               content = excluded.content, \
               file_path = excluded.file_path, \
               tool_input = excluded.tool_input, \
               tool_output = excluded.tool_output, \
               model_name = excluded.model_name, \
               elapsed_seconds = excluded.elapsed_seconds, \
               updated_at = excluded.updated_at",
        )
        .bind(id)
        .bind(user_id)
        .bind(mission_id)
        .bind(seq)
        .bind(event_type)
        .bind(content)
        .bind(&file_path)
        .bind(&tool_input)
        .bind(&tool_output)
        .bind(&model_name)
        .bind(elapsed_seconds)
        .bind(created_at)
        .bind(updated_at)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}

/// Check whether the client can reach Supabase (for health endpoints).
pub async fn is_supabase_reachable(supabase_url: &str, service_key: &str) -> bool {
    if supabase_url.is_empty() || service_key.is_empty() {
        return false;
    }
    let client = SupabaseClient::new(supabase_url, service_key);
    client.health_check().await
}

/// Log a mutation to `_sync_log` so the sync engine can push it to Supabase.
///
/// Call this after every local SQLite INSERT/UPDATE/DELETE on a synced table.
/// Pending entries must survive outages regardless of queue size. Capacity
/// management must never discard edits that have not reached the remote store.
pub async fn log_mutation(
    db: &SqlitePool,
    table: &str,
    row_id: &str,
    operation: &str,
    payload: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO _sync_log (table_name, row_id, operation, payload) VALUES (?, ?, ?, ?)",
    )
    .bind(table)
    .bind(row_id)
    .bind(operation)
    .bind(payload)
    .execute(db)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn outbox_db(path: &std::path::Path) -> SqlitePool {
        let db = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(
                sqlx::sqlite::SqliteConnectOptions::new()
                    .filename(path)
                    .create_if_missing(true),
            )
            .await
            .unwrap();
        // Exercise the actual queue schema without opening a user's data root.
        sqlx::raw_sql(include_str!("../migrations/0003_sync_tables.sql"))
            .execute(&db)
            .await
            .unwrap();
        db
    }

    async fn outbox_snapshot(db: &SqlitePool) -> Vec<(String, String, Option<i64>)> {
        sqlx::query_as("SELECT row_id, payload, synced_at FROM _sync_log ORDER BY id")
            .fetch_all(db)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn unsupported_and_invalid_rows_remain_pending_after_restart() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("outbox.db");
        let db = outbox_db(&path).await;
        for (table, id) in [("career_profiles", "profile-1"), ("todos", "invalid.id")] {
            log_mutation(&db, table, id, "UPDATE", Some("{\"id\":\"fixture\"}"))
                .await
                .unwrap();
        }
        let before = outbox_snapshot(&db).await;
        let engine = SyncEngine::new(db.clone(), String::new(), String::new(), Arc::default());
        // Neither rejected row may trigger an HTTP request or be acknowledged.
        let client = SupabaseClient::new("http://127.0.0.1:1", "fixture-key");
        engine.push(&client, "fixture-jwt").await.unwrap();
        drop(engine);
        db.close().await;

        let reopened = outbox_db(&path).await;
        let after = outbox_snapshot(&reopened).await;
        reopened.close().await;
        assert_eq!(after, before, "unuploaded changes must survive unchanged");
        assert!(after.iter().all(|(_, _, synced)| synced.is_none()));
    }

    #[tokio::test]
    async fn outbox_keeps_oldest_unsent_changes_above_previous_limit() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("outbox.db");
        let db = outbox_db(&path).await;
        sqlx::query(
            "WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value+1 FROM n WHERE value<10001) \
             INSERT INTO _sync_log (table_name,row_id,operation,payload) \
             SELECT 'todos', printf('row-%d',value), 'UPDATE', '{\"id\":\"fixture\"}' FROM n",
        )
        .execute(&db)
        .await
        .unwrap();
        log_mutation(
            &db,
            "todos",
            "newest",
            "UPDATE",
            Some("{\"id\":\"newest\"}"),
        )
        .await
        .unwrap();
        db.close().await;

        let reopened = outbox_db(&path).await;
        let rows = outbox_snapshot(&reopened).await;
        reopened.close().await;
        assert_eq!(
            rows.len(),
            10002,
            "queue pressure must not delete unsent edits"
        );
        assert_eq!(rows.first().unwrap().0, "row-1");
        assert_eq!(rows.last().unwrap().0, "newest");
        assert!(rows.iter().all(|(_, _, synced)| synced.is_none()));
    }

    #[tokio::test]
    async fn malformed_payload_does_not_block_later_uploads_and_http_failures_retry() {
        use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
        use std::sync::Mutex;

        let requests = Arc::new(Mutex::new(Vec::<Value>::new()));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let app = Router::new()
            .route(
                "/rest/v1/todos",
                post(
                    |State(requests): State<Arc<Mutex<Vec<Value>>>>,
                     headers: axum::http::HeaderMap,
                     Json(body): Json<Value>| async move {
                        assert_eq!(headers["authorization"], "Bearer fixture-jwt");
                        assert_eq!(headers["apikey"], "fixture-key");
                        requests.lock().unwrap().push(body.clone());
                        if body["id"] == "retry" {
                            (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({})))
                        } else {
                            (StatusCode::CREATED, Json(serde_json::json!([body])))
                        }
                    },
                ),
            )
            .with_state(requests.clone());
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let temp = tempfile::tempdir().unwrap();
        let db = outbox_db(&temp.path().join("outbox.db")).await;
        for (id, payload) in [
            ("broken", "{not-json"),
            ("retry", "{\"id\":\"retry\"}"),
            ("accepted", "{\"id\":\"accepted\"}"),
        ] {
            log_mutation(&db, "todos", id, "UPDATE", Some(payload))
                .await
                .unwrap();
        }
        let engine = SyncEngine::new(db.clone(), String::new(), String::new(), Arc::default());
        let client = SupabaseClient::new(&format!("http://{address}"), "fixture-key");
        let first = engine.push(&client, "fixture-jwt").await;
        let second = engine.push(&client, "fixture-jwt").await;
        server.abort();
        first.unwrap();
        second.unwrap();
        let rows = outbox_snapshot(&db).await;
        assert!(rows[0].2.is_none(), "malformed payload is not synced");
        assert!(rows[1].2.is_none(), "HTTP failure remains retryable");
        assert!(rows[2].2.is_some_and(|timestamp| timestamp > 0));
        let ids: Vec<_> = requests
            .lock()
            .unwrap()
            .iter()
            .map(|row| row["id"].as_str().unwrap().to_owned())
            .collect();
        assert_eq!(ids, ["retry", "accepted", "retry"]);
        drop(engine);
        db.close().await;
    }

    #[test]
    fn sync_tables_not_empty() {
        assert!(!SYNC_TABLES.is_empty());
    }

    #[test]
    fn sync_tables_contains_todos() {
        assert!(SYNC_TABLES.contains(&"todos"));
    }

    #[test]
    fn sync_tables_contains_missions() {
        assert!(SYNC_TABLES.contains(&"missions"));
    }

    #[test]
    fn sync_tables_contains_agents() {
        assert!(SYNC_TABLES.contains(&"agents"));
    }

    #[test]
    fn sync_tables_contains_mission_events() {
        assert!(SYNC_TABLES.contains(&"mission_events"));
    }

    #[test]
    fn sync_tables_contains_all_expected() {
        let expected = vec![
            "todos",
            "missions",
            "mission_events",
            "agents",
            "ideas",
            "captures",
            "habits",
            "habit_entries",
            "user_preferences",
            "changelog_entries",
            "decisions",
            "knowledge_entries",
            "daily_reviews",
            "weekly_reviews",
            "retrospectives",
            "workflow_notes",
            "cache",
            GENERATED_MODULE_TABLE,
            GENERATED_MODULE_VERSION_TABLE,
        ];
        for table in expected {
            assert!(
                SYNC_TABLES.contains(&table),
                "SYNC_TABLES should contain {table}"
            );
        }
    }

    #[tokio::test]
    async fn is_supabase_reachable_returns_false_for_empty_url() {
        assert!(!is_supabase_reachable("", "key").await);
    }

    #[tokio::test]
    async fn is_supabase_reachable_returns_false_for_empty_key() {
        assert!(!is_supabase_reachable("http://localhost:54321", "").await);
    }
}

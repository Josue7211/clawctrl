//! Conditional note writes and durable retries share the existing vault transaction.
use super::*;
use crate::routes::mobile::NotesPrincipal;

pub(super) async fn put(
    state: &AppState,
    session: &NotesPrincipal,
    id: &str,
    mut body: Value,
) -> Result<Json<Value>, AppError> {
    crate::notes_contract::validate_write(id, &body)?;
    body.sort_all_objects();
    let request_checksum = checksum(&json!([id, body]).to_string());
    let operation = body.get("operation_id").and_then(Value::as_str);
    // Reserve SQLite's writer before reading a revision or receipt. No pool
    // helper is called while this transaction holds its connection.
    let mut tx = state.db.begin_with("BEGIN IMMEDIATE").await?;
    session.check_active(&mut tx).await?;
    if let Some(operation) = operation {
        let receipt = sqlx::query("SELECT document_id, request_checksum, response_json FROM vault_note_write_receipts WHERE user_id = ? AND operation_id = ?")
            .bind(&session.user_id).bind(operation).fetch_optional(&mut *tx).await?;
        if let Some(receipt) = receipt {
            if receipt.try_get::<String, _>("document_id")? != id
                || receipt.try_get::<String, _>("request_checksum")? != request_checksum
            {
                return Err(AppError::Conflict(
                    "Operation ID already used for a different write".into(),
                ));
            }
            let response = serde_json::from_str(&receipt.try_get::<String, _>("response_json")?)
                .map_err(|error| AppError::Internal(error.into()))?;
            tx.commit().await?;
            return Ok(Json(response));
        }
    }
    let existing = sqlx::query(
        "SELECT folder_path, trashed_at, updated_at, deleted_at FROM vault_documents WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    let previous = existing
        .as_ref()
        .map(|row| row.try_get::<i64, _>("updated_at"))
        .transpose()?;
    let base = body.get("_rev").and_then(Value::as_str);
    let conflict =
        || AppError::Conflict("Note changed; reload its current revision before saving".into());
    if let Some(row) = existing.as_ref() {
        if row.try_get::<Option<i64>, _>("deleted_at")?.is_some()
            || base != previous.map(|value| format!("local-{value}")).as_deref()
        {
            return Err(conflict());
        }
    } else if base.is_some() {
        return Err(conflict());
    }
    let now = match previous {
        Some(previous) => now_millis().max(
            previous
                .checked_add(1)
                .ok_or_else(|| AppError::Internal(anyhow::anyhow!("Invalid note revision")))?,
        ),
        None => now_millis(),
    };
    if existing.is_some() {
        create_coalesced_autosave_version_in(&mut tx, id).await?;
    }
    let title = body
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or_else(|| {
            id.trim_end_matches(".md")
                .rsplit('/')
                .next()
                .unwrap_or("Untitled")
        })
        .trim();
    let title = if title.is_empty() { "Untitled" } else { title };
    let content = body["content"].as_str().expect("validated content");
    let folder = if let Some(row) = existing.as_ref().filter(|row| {
        row.try_get::<Option<i64>, _>("trashed_at")
            .ok()
            .flatten()
            .is_some()
    }) {
        row.try_get::<String, _>("folder_path")?
    } else {
        normalize_folder_path(
            body.get("folder")
                .and_then(Value::as_str)
                .unwrap_or_else(|| id.rsplit_once('/').map(|(folder, _)| folder).unwrap_or("")),
        )
    };
    ensure_folder_in(&mut tx, &folder).await?;
    let result = sqlx::query(
        "INSERT INTO vault_documents \
         (id, path, title, kind, content_markdown, content_json, folder_path, tags_json, links_json, aliases_json, properties_json, created_at, updated_at, checksum) \
         VALUES (?, ?, ?, 'note', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
         ON CONFLICT(id) DO UPDATE SET \
            path = excluded.path, title = excluded.title, kind = excluded.kind, \
            content_markdown = excluded.content_markdown, content_json = excluded.content_json, \
            folder_path = excluded.folder_path, tags_json = excluded.tags_json, links_json = excluded.links_json, \
            aliases_json = excluded.aliases_json, properties_json = excluded.properties_json, \
            updated_at = excluded.updated_at, checksum = excluded.checksum \
         WHERE vault_documents.updated_at = ? AND vault_documents.deleted_at IS NULL",
    )
    .bind(id).bind(id).bind(title).bind(content)
    .bind(body.get("content_json").map(Value::to_string)).bind(&folder)
    .bind(json_text(body.get("tags"), json!([])))
    .bind(json_text(body.get("links"), json!([])))
    .bind(json_text(body.get("aliases"), json!([])))
    .bind(json_text(body.get("properties"), json!({})))
    .bind(body.get("created_at").and_then(Value::as_i64).unwrap_or(now))
    .bind(now).bind(checksum(content)).bind(previous)
    .execute(&mut *tx).await?;
    if result.rows_affected() != 1 {
        return Err(conflict());
    }
    update_search_index_in(&mut tx, id).await?;
    if existing.is_none() {
        create_version_with_label_in(&mut tx, id, "create", None).await?;
    }
    write_audit_in(
        &mut tx,
        Some(id),
        if existing.is_some() {
            "update"
        } else {
            "create"
        },
        json!({"path":id,"folder":folder}),
    )
    .await?;
    let response = success_json(json!({"id":id,"rev":format!("local-{now}")}));
    if let Some(operation) = operation {
        sqlx::query("INSERT INTO vault_note_write_receipts (user_id, operation_id, document_id, request_checksum, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&session.user_id).bind(operation).bind(id).bind(request_checksum)
            .bind(response.0.to_string()).bind(now).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(response)
}

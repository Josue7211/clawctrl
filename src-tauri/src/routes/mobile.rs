//! Revocable Notes-only device connections; no desktop key or shared login on phones.
use crate::{
    error::{success_json, AppError},
    server::{AppState, RequireAuth},
};
use axum::{
    body::Body,
    extract::{FromRequestParts, Path, State},
    http::{request::Parts, Method, Request},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use rand::RngCore;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::Row;

const TOKEN_PREFIX: &str = "ccm_v1.";
const LIFETIME_MS: i64 = 90 * 24 * 60 * 60 * 1000;
fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
fn fingerprint(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

#[derive(Clone)]
pub(crate) struct NotesPrincipal {
    pub user_id: String,
    pub device_id: Option<String>,
}
impl NotesPrincipal {
    pub async fn check_active(&self, conn: &mut sqlx::SqliteConnection) -> Result<(), AppError> {
        if let Some(id) = &self.device_id {
            let active: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM mobile_devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?)")
                .bind(id).bind(&self.user_id).bind(now()).fetch_one(conn).await?;
            if !active {
                return Err(AppError::Unauthorized);
            }
        }
        Ok(())
    }
}

pub(crate) struct RequireNotesAuth(pub NotesPrincipal);
#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for RequireNotesAuth {
    type Rejection = Response;
    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Response> {
        if let Some(principal) = parts.extensions.get::<NotesPrincipal>() {
            return Ok(Self(principal.clone()));
        }
        let RequireAuth(session) = RequireAuth::from_request_parts(parts, state).await?;
        Ok(Self(NotesPrincipal {
            user_id: session.user_id.clone(),
            device_id: None,
        }))
    }
}

fn allowed(method: &Method, path: &str) -> bool {
    matches!(
        (method.as_str(), path),
        (
            "GET",
            "/api/mobile/capabilities" | "/api/vault/local/documents" | "/api/vault/local/doc"
        ) | ("PUT", "/api/vault/local/doc")
    )
}

fn device_response(mut response: Response) -> Response {
    use axum::http::{header, HeaderValue, StatusCode};
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    let challenge = match response.status() {
        StatusCode::UNAUTHORIZED => Some("Bearer realm=\"notes\", error=\"invalid_token\""),
        StatusCode::FORBIDDEN => Some("Bearer realm=\"notes\", error=\"insufficient_scope\""),
        _ => None,
    };
    if let Some(challenge) = challenge {
        response.headers_mut().insert(
            header::WWW_AUTHENTICATE,
            HeaderValue::from_static(challenge),
        );
    }
    response
}

/// Outermost authentication boundary: a mobile bearer credential never falls through to
/// the owner's global desktop session/key, including on auth/setup/resource paths.
pub(crate) async fn authenticate(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let Some(header) = request.headers().get("authorization") else {
        return next.run(request).await;
    };
    // Other integrations have their own Authorization protocols. Only this
    // reserved credential format enters the mobile boundary.
    let raw = header.to_str().unwrap_or_default();
    if !raw
        .get(..7)
        .is_some_and(|scheme| scheme.eq_ignore_ascii_case("Bearer "))
        || !raw[7..].starts_with(TOKEN_PREFIX)
    {
        return next.run(request).await;
    }
    let token = Some(&raw[7..]);
    let Some(token) = token.filter(|token| {
        token.len() == TOKEN_PREFIX.len() + 64
            && token.starts_with(TOKEN_PREFIX)
            && token[TOKEN_PREFIX.len()..]
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit())
    }) else {
        return device_response(AppError::Unauthorized.into_response());
    };
    let row = sqlx::query("SELECT id, user_id FROM mobile_devices WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?")
        .bind(fingerprint(token)).bind(now()).fetch_optional(&state.db).await;
    let row = match row {
        Ok(Some(row)) => row,
        Ok(None) => return device_response(AppError::Unauthorized.into_response()),
        Err(error) => return device_response(AppError::from(error).into_response()),
    };
    if !allowed(request.method(), request.uri().path()) {
        return device_response(AppError::Forbidden(
            "This device connection supports Notes only; this operation requires desktop access"
                .into(),
        )
        .into_response());
    }
    let principal = NotesPrincipal {
        user_id: row.get("user_id"),
        device_id: Some(row.get("id")),
    };
    request.extensions_mut().insert(principal);
    device_response(next.run(request).await)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mobile/capabilities", get(capabilities))
        .route("/mobile/devices", get(list_devices).post(create_device))
        .route("/mobile/devices/:id", axum::routing::delete(revoke_device))
}

async fn capabilities(
    State(state): State<AppState>,
    RequireNotesAuth(principal): RequireNotesAuth,
) -> Result<Json<Value>, AppError> {
    let credential = if let Some(id) = principal.device_id {
        let expires: i64 = sqlx::query_scalar("SELECT expires_at FROM mobile_devices WHERE id = ? AND revoked_at IS NULL AND expires_at > ?")
            .bind(&id).bind(now()).fetch_optional(&state.db).await?.ok_or(AppError::Unauthorized)?;
        json!({"device_id":id, "expires_at":expires})
    } else {
        Value::Null
    };
    Ok(success_json(json!({
        "protocol_version":1,
        "notes":{"list":true,"read":true,"write":true,"revision_conflicts":true,"idempotency":true},
        "desktop_only":["shell","filesystem","service_management","device_management"],
        "backend":{"mode":if state.app.is_some() {"desktop"} else {"headless"},
            "os":std::env::consts::OS,"must_remain_running":true,"vault_scope":"device_local"},
        "credential":credential,
    })))
}

#[derive(Deserialize)]
struct CreateDevice {
    name: String,
}
async fn create_device(
    State(state): State<AppState>,
    RequireAuth(session): RequireAuth,
    Json(body): Json<CreateDevice>,
) -> Result<Json<Value>, AppError> {
    let name = body.name.trim();
    if name.is_empty() || name.chars().count() > 80 || name.chars().any(char::is_control) {
        return Err(AppError::BadRequest(
            "Device name must contain 1–80 printable characters".into(),
        ));
    }
    let mut random = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random);
    let token = format!("{TOKEN_PREFIX}{}", hex::encode(random));
    let id = super::util::random_uuid();
    let created_at = now();
    let expires_at = created_at + LIFETIME_MS;
    sqlx::query("INSERT INTO mobile_devices (id,user_id,name,token_hash,created_at,expires_at) VALUES (?,?,?,?,?,?)")
        .bind(&id).bind(&session.user_id).bind(name).bind(fingerprint(&token)).bind(created_at).bind(expires_at).execute(&state.db).await?;
    Ok(success_json(
        json!({"device":{"id":id,"name":name,"created_at":created_at,"expires_at":expires_at,"revoked_at":null},"token":token}),
    ))
}
async fn list_devices(
    State(state): State<AppState>,
    RequireAuth(session): RequireAuth,
) -> Result<Json<Value>, AppError> {
    let rows = sqlx::query("SELECT id,name,created_at,expires_at,revoked_at FROM mobile_devices WHERE user_id = ? ORDER BY created_at DESC, id")
        .bind(&session.user_id).fetch_all(&state.db).await?;
    let devices: Vec<_> = rows.iter().map(|row|json!({"id":row.get::<String,_>("id"),"name":row.get::<String,_>("name"),
        "created_at":row.get::<i64,_>("created_at"),"expires_at":row.get::<i64,_>("expires_at"),"revoked_at":row.get::<Option<i64>,_>("revoked_at")})).collect();
    Ok(success_json(json!({"devices":devices})))
}
async fn revoke_device(
    State(state): State<AppState>,
    RequireAuth(session): RequireAuth,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let result = sqlx::query("UPDATE mobile_devices SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ? AND user_id = ?")
        .bind(now()).bind(&id).bind(&session.user_id).execute(&state.db).await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Device not found".into()));
    }
    Ok(success_json(json!({"id":id,"revoked":true})))
}

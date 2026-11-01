//! One wire contract, shared with generated frontend types and review fixtures.
use crate::error::AppError;
use serde_json::Value;
use std::sync::LazyLock;

pub(crate) const SOURCE: &str = include_str!("../../shared/contracts/notes.openapi.json");

pub(crate) fn validator(name: &str) -> jsonschema::Validator {
    let mut schema: Value = serde_json::from_str(SOURCE).expect("Notes contract JSON");
    schema["$schema"] = Value::String("https://json-schema.org/draft/2020-12/schema".into());
    schema["$ref"] = Value::String(format!("#/components/schemas/{name}"));
    jsonschema::validator_for(&schema).expect("Notes contract schema")
}

static WRITE: LazyLock<jsonschema::Validator> = LazyLock::new(|| validator("NoteWrite"));
static ID: LazyLock<jsonschema::Validator> = LazyLock::new(|| validator("NoteId"));

pub(crate) fn validate_write(id: &str, body: &Value) -> Result<(), AppError> {
    if !ID.is_valid(&Value::String(id.into())) || !WRITE.is_valid(body) {
        return Err(AppError::BadRequest("Invalid Notes API write".into()));
    }
    if body
        .get("_id")
        .and_then(Value::as_str)
        .is_some_and(|value| value != id)
    {
        return Err(AppError::BadRequest("Document IDs do not match".into()));
    }
    Ok(())
}

-- Durable receipts protect retries even after another edit or note deletion.
-- No note content or tokens are duplicated into this table.
CREATE TABLE vault_note_write_receipts (
    user_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    request_checksum TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, operation_id)
);

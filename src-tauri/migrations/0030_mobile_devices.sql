-- Revocable Notes-only credentials. Raw tokens are returned once, never stored.
CREATE TABLE mobile_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
);
CREATE INDEX mobile_devices_owner ON mobile_devices(user_id, created_at);

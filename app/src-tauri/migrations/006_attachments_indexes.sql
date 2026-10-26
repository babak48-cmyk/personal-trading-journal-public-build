CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_stage ON attachments(stage);

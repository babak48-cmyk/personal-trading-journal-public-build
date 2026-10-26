-- Gate 3 additive typed custom-field schema. No existing journal tables are rewritten.
-- Definitions and options keep stable identifiers; values record immutable snapshots.
CREATE TABLE custom_field_definitions (
  field_id TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK(field_type IN ('TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT')),
  label TEXT NOT NULL CHECK(length(trim(label))>0),
  help_text TEXT NOT NULL DEFAULT '',
  is_required INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order>=0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE custom_field_options (
  option_id TEXT PRIMARY KEY,
  field_id TEXT NOT NULL REFERENCES custom_field_definitions(field_id) ON DELETE RESTRICT,
  label TEXT NOT NULL CHECK(length(trim(label))>0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK(display_order>=0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(field_id,option_id)
);
CREATE INDEX idx_custom_options_field_order ON custom_field_options(field_id,display_order);
-- Each append-only value carries typed content and a timestamp, without modifying canonical records.
-- owner_id is the canonical entity identifier; stage allows future record-kind enforcement in service layer.
CREATE TABLE custom_field_value_events (
  event_id TEXT PRIMARY KEY,
  field_id TEXT NOT NULL REFERENCES custom_field_definitions(field_id) ON DELETE RESTRICT,
  owner_stage TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK(value_type IN ('TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT')),
  text_value TEXT,
  number_value REAL,
  boolean_value INTEGER CHECK(boolean_value IN (0,1)),
  date_value TEXT,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  supersedes_event_id TEXT REFERENCES custom_field_value_events(event_id) ON DELETE RESTRICT,
  CHECK (
    (value_type='TEXT' AND text_value IS NOT NULL AND number_value IS NULL AND boolean_value IS NULL AND date_value IS NULL) OR
    (value_type='NUMBER' AND number_value IS NOT NULL AND text_value IS NULL AND boolean_value IS NULL AND date_value IS NULL) OR
    (value_type='BOOLEAN' AND boolean_value IS NOT NULL AND text_value IS NULL AND number_value IS NULL AND date_value IS NULL) OR
    (value_type='DATE' AND date_value IS NOT NULL AND text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL) OR
    (value_type IN ('SINGLE_SELECT','MULTI_SELECT') AND text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL AND date_value IS NULL)
  )
);
CREATE INDEX idx_custom_field_value_lookup ON custom_field_value_events(owner_stage,owner_id,field_id,recorded_at);
CREATE TABLE custom_field_selection_snapshots (
  event_id TEXT NOT NULL REFERENCES custom_field_value_events(event_id) ON DELETE RESTRICT,
  option_id TEXT NOT NULL REFERENCES custom_field_options(option_id) ON DELETE RESTRICT,
  label_at_selection TEXT NOT NULL CHECK(length(trim(label_at_selection))>0),
  ordinal INTEGER NOT NULL CHECK(ordinal>=0),
  PRIMARY KEY(event_id,option_id),
  UNIQUE(event_id,ordinal)
);
-- Confirmed history is append-only; corrections append a superseding event.
CREATE TRIGGER custom_value_no_update BEFORE UPDATE ON custom_field_value_events BEGIN SELECT RAISE(ABORT,'custom field history is append-only'); END;
CREATE TRIGGER custom_value_no_delete BEFORE DELETE ON custom_field_value_events BEGIN SELECT RAISE(ABORT,'custom field history is append-only'); END;
CREATE TRIGGER custom_snapshot_no_update BEFORE UPDATE ON custom_field_selection_snapshots BEGIN SELECT RAISE(ABORT,'selection history is append-only'); END;
CREATE TRIGGER custom_snapshot_no_delete BEFORE DELETE ON custom_field_selection_snapshots BEGIN SELECT RAISE(ABORT,'selection history is append-only'); END;

ALTER TABLE level_source_types ADD COLUMN display_order INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE level_source_types ADD COLUMN manager_group TEXT;

UPDATE level_source_types
SET display_order = rowid
WHERE display_order = 1000;

UPDATE level_source_types
SET active = 1
WHERE code IN ('MANUAL','OTHER');

CREATE INDEX IF NOT EXISTS idx_level_source_types_workspace_order
ON level_source_types(workspace_id, display_order, label);

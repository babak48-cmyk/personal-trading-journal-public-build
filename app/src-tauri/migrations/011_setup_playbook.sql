-- Group 10 extension of the EXISTING canonical setups/setup_versions.
-- Do NOT create parallel setup IDs or change old Trade/Zone references.
CREATE TABLE setup_playbook_details (
  version_id TEXT PRIMARY KEY REFERENCES setup_versions(setup_version_id),
  version_number INTEGER NOT NULL CHECK(version_number>=1),
  created_at TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  source_trade_id TEXT REFERENCES trades(trade_id),
  market_context TEXT,
  zone_location TEXT,
  prerequisites TEXT,
  entry_triggers TEXT,
  supporting_evidence TEXT,
  contrary_evidence TEXT,
  thesis_invalidation TEXT,
  notes TEXT,
  is_approved INTEGER NOT NULL CHECK(is_approved IN (0,1))
);
CREATE TABLE setup_evidence_priorities (
  priority_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES setup_playbook_details(version_id),
  evidence_label TEXT NOT NULL CHECK(length(trim(evidence_label)) BETWEEN 1 AND 120),
  priority_role TEXT NOT NULL CHECK(priority_role IN ('REQUIRED','SUPPORTING','CONTRADICTORY','NOT_RELEVANT')),
  explanation TEXT,
  position INTEGER NOT NULL CHECK(position>=0),
  UNIQUE(version_id,evidence_label COLLATE NOCASE)
);
CREATE TABLE setup_trade_links (
  trade_id TEXT PRIMARY KEY REFERENCES trades(trade_id),
  version_id TEXT NOT NULL REFERENCES setup_playbook_details(version_id),
  linked_at TEXT NOT NULL,
  link_note TEXT CHECK(link_note IS NULL OR length(trim(link_note))<=500)
);
CREATE INDEX idx_setup_playbook_versions ON setup_versions(setup_id,version_label);
CREATE INDEX idx_setup_evidence_priorities ON setup_evidence_priorities(version_id,position);
CREATE INDEX idx_setup_trade_links ON setup_trade_links(version_id);
CREATE TRIGGER setup_playbook_details_update_block BEFORE UPDATE ON setup_playbook_details
BEGIN SELECT RAISE(ABORT,'historical playbook detail immutable'); END;
CREATE TRIGGER setup_playbook_details_delete_block BEFORE DELETE ON setup_playbook_details
BEGIN SELECT RAISE(ABORT,'historical playbook detail immutable'); END;
-- A canonical Setup version becomes immutable as soon as it owns details;
-- otherwise older, already-supported setup records retain their original semantics.
CREATE TRIGGER setup_canonical_version_update_block BEFORE UPDATE ON setup_versions
WHEN EXISTS (SELECT 1 FROM setup_playbook_details WHERE version_id=OLD.setup_version_id)
BEGIN SELECT RAISE(ABORT,'versioned playbook canonical version immutable'); END;
CREATE TRIGGER setup_canonical_version_delete_block BEFORE DELETE ON setup_versions
WHEN EXISTS (SELECT 1 FROM setup_playbook_details WHERE version_id=OLD.setup_version_id)
BEGIN SELECT RAISE(ABORT,'versioned playbook canonical version immutable'); END;
CREATE TRIGGER setup_priority_update_block BEFORE UPDATE ON setup_evidence_priorities
BEGIN SELECT RAISE(ABORT,'historical setup priorities immutable'); END;
CREATE TRIGGER setup_priority_delete_block BEFORE DELETE ON setup_evidence_priorities
BEGIN SELECT RAISE(ABORT,'historical setup priorities immutable'); END;
CREATE TRIGGER setup_trade_link_update_block BEFORE UPDATE ON setup_trade_links
BEGIN SELECT RAISE(ABORT,'historical setup attribution immutable'); END;
CREATE TRIGGER setup_trade_link_delete_block BEFORE DELETE ON setup_trade_links
BEGIN SELECT RAISE(ABORT,'historical setup attribution immutable'); END;

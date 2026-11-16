-- Group 10 only: versioned human-approved Setup Playbook. Never edit
-- a historical Setup version or rewrite a Decision, Fill or original Trade.
CREATE TABLE setup_playbooks (
  setup_id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE setup_versions (
  version_id TEXT PRIMARY KEY,
  setup_id TEXT NOT NULL REFERENCES setup_playbooks(setup_id),
  version_number INTEGER NOT NULL CHECK(version_number>=1),
  created_at TEXT NOT NULL,
  source_trade_id TEXT REFERENCES trades(trade_id),
  market_context TEXT,
  zone_location TEXT,
  prerequisites TEXT,
  entry_triggers TEXT,
  supporting_evidence TEXT,
  contrary_evidence TEXT,
  thesis_invalidation TEXT,
  notes TEXT,
  is_approved INTEGER NOT NULL DEFAULT 0 CHECK(is_approved IN (0,1)),
  UNIQUE(setup_id,version_number)
);
CREATE TABLE setup_evidence_priorities (
  priority_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES setup_versions(version_id),
  evidence_label TEXT NOT NULL CHECK(length(trim(evidence_label)) BETWEEN 1 AND 120),
  priority_role TEXT NOT NULL CHECK(priority_role IN ('REQUIRED','SUPPORTING','CONTRADICTORY','NOT_RELEVANT')),
  explanation TEXT,
  position INTEGER NOT NULL CHECK(position>=0),
  UNIQUE(version_id,evidence_label COLLATE NOCASE)
);
CREATE TABLE setup_trade_links (
  trade_id TEXT PRIMARY KEY REFERENCES trades(trade_id),
  version_id TEXT NOT NULL REFERENCES setup_versions(version_id),
  linked_at TEXT NOT NULL,
  link_note TEXT,
  CHECK(length(trim(link_note))<=500 OR link_note IS NULL)
);
CREATE INDEX idx_setup_versions ON setup_versions(setup_id,version_number);
CREATE INDEX idx_setup_evidence_priorities ON setup_evidence_priorities(version_id,position);
CREATE INDEX idx_setup_trade_links_version ON setup_trade_links(version_id);
CREATE TRIGGER setup_version_update_block BEFORE UPDATE ON setup_versions
BEGIN SELECT RAISE(ABORT,'historical setup version immutable'); END;
CREATE TRIGGER setup_version_delete_block BEFORE DELETE ON setup_versions
BEGIN SELECT RAISE(ABORT,'historical setup version immutable'); END;
CREATE TRIGGER setup_priority_update_block BEFORE UPDATE ON setup_evidence_priorities
BEGIN SELECT RAISE(ABORT,'historical setup priorities immutable'); END;
CREATE TRIGGER setup_priority_delete_block BEFORE DELETE ON setup_evidence_priorities
BEGIN SELECT RAISE(ABORT,'historical setup priorities immutable'); END;
CREATE TRIGGER setup_trade_link_update_block BEFORE UPDATE ON setup_trade_links
BEGIN SELECT RAISE(ABORT,'historical setup attribution immutable'); END;
CREATE TRIGGER setup_trade_link_delete_block BEFORE DELETE ON setup_trade_links
BEGIN SELECT RAISE(ABORT,'historical setup attribution immutable'); END;

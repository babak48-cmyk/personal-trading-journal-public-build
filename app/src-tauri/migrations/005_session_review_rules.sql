PRAGMA foreign_keys = ON;

-- Lightweight session-level pre-trade psychology state. One short state per session.
CREATE TABLE IF NOT EXISTS session_pre_states (
  session_pre_state_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(session_id),
  state_type TEXT,
  intensity INTEGER CHECK(intensity BETWEEN 1 AND 5 OR intensity IS NULL),
  note TEXT,
  created_at TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

-- Version-aware rule foundation. UI stays lightweight; exact per-rule grading can expand later.
CREATE TABLE IF NOT EXISTS rules (
  rule_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('TRADE','SESSION','BOTH')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  user_defined INTEGER NOT NULL DEFAULT 0 CHECK(user_defined IN (0,1)),
  UNIQUE(workspace_id, code)
);

CREATE TABLE IF NOT EXISTS rule_versions (
  rule_version_id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES rules(rule_id),
  version_label TEXT NOT NULL,
  effective_from TEXT,
  effective_to TEXT,
  definition TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT','ACTIVE','RETIRED')),
  UNIQUE(rule_id, version_label)
);

-- A quick one-question rule check per trade. This prevents a long checklist in daily use.
CREATE TABLE IF NOT EXISTS trade_rule_checks (
  trade_rule_check_id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL UNIQUE REFERENCES trades(trade_id),
  checked_at TEXT NOT NULL,
  any_violation INTEGER NOT NULL CHECK(any_violation IN (0,1)),
  note TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS rule_assessments (
  rule_assessment_id TEXT PRIMARY KEY,
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(rule_version_id),
  trade_id TEXT REFERENCES trades(trade_id),
  session_id TEXT REFERENCES sessions(session_id),
  assessed_at TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('FOLLOWED','VIOLATED','NA','UNKNOWN')),
  severity INTEGER CHECK(severity BETWEEN 1 AND 5 OR severity IS NULL),
  note TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE',
  CHECK((trade_id IS NOT NULL AND session_id IS NULL) OR (trade_id IS NULL AND session_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_rule ON rule_versions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_assessments_trade ON rule_assessments(trade_id);
CREATE INDEX IF NOT EXISTS idx_rule_assessments_session ON rule_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_rule_assessments_version_result ON rule_assessments(rule_version_id, result);

-- Session reviews already existed in v1 foundation. Add updated_at for safe draft saves.
ALTER TABLE session_reviews ADD COLUMN updated_at TEXT;

CREATE TRIGGER IF NOT EXISTS trg_completed_session_review_no_update
BEFORE UPDATE ON session_reviews
WHEN OLD.status='COMPLETED'
BEGIN SELECT RAISE(ABORT, 'completed session reviews are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_completed_session_review_no_delete
BEFORE DELETE ON session_reviews
WHEN OLD.status='COMPLETED'
BEGIN SELECT RAISE(ABORT, 'completed session reviews are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_locked_trade_rule_check_update
BEFORE UPDATE ON trade_rule_checks
WHEN EXISTS(SELECT 1 FROM trade_reviews tr WHERE tr.trade_id=OLD.trade_id AND tr.status='COMPLETED')
BEGIN SELECT RAISE(ABORT, 'rule check is locked after completed trade review'); END;

CREATE TRIGGER IF NOT EXISTS trg_locked_trade_rule_check_delete
BEFORE DELETE ON trade_rule_checks
WHEN EXISTS(SELECT 1 FROM trade_reviews tr WHERE tr.trade_id=OLD.trade_id AND tr.status='COMPLETED')
BEGIN SELECT RAISE(ABORT, 'rule check is locked after completed trade review'); END;

CREATE TRIGGER IF NOT EXISTS trg_locked_rule_assessment_update
BEFORE UPDATE ON rule_assessments
WHEN OLD.trade_id IS NOT NULL AND EXISTS(SELECT 1 FROM trade_reviews tr WHERE tr.trade_id=OLD.trade_id AND tr.status='COMPLETED')
BEGIN SELECT RAISE(ABORT, 'rule assessment is locked after completed trade review'); END;

CREATE TRIGGER IF NOT EXISTS trg_locked_rule_assessment_delete
BEFORE DELETE ON rule_assessments
WHEN OLD.trade_id IS NOT NULL AND EXISTS(SELECT 1 FROM trade_reviews tr WHERE tr.trade_id=OLD.trade_id AND tr.status='COMPLETED')
BEGIN SELECT RAISE(ABORT, 'rule assessment is locked after completed trade review'); END;

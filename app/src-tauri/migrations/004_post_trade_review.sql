CREATE TABLE IF NOT EXISTS trade_reviews (
  review_id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL UNIQUE REFERENCES trades(trade_id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','COMPLETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  decision_quality TEXT CHECK(decision_quality IN ('A','B','C','INVALID','UNCLEAR') OR decision_quality IS NULL),
  execution_quality TEXT CHECK(execution_quality IN ('GOOD','ACCEPTABLE','NEEDS_IMPROVEMENT','UNCLEAR') OR execution_quality IS NULL),
  management_quality TEXT CHECK(management_quality IN ('GOOD','ACCEPTABLE','NEEDS_IMPROVEMENT','UNCLEAR') OR management_quality IS NULL),
  exit_reason_code TEXT,
  exit_reason_note TEXT,
  emotion_affected INTEGER CHECK(emotion_affected IN (0,1) OR emotion_affected IS NULL),
  psychology_state TEXT,
  psychology_intensity INTEGER CHECK(psychology_intensity BETWEEN 1 AND 5 OR psychology_intensity IS NULL),
  psychology_stage TEXT CHECK(psychology_stage IN ('ENTRY','MANAGEMENT','EXIT','MULTIPLE') OR psychology_stage IS NULL),
  note TEXT
);

CREATE TRIGGER IF NOT EXISTS trg_completed_trade_review_no_update
BEFORE UPDATE ON trade_reviews
WHEN OLD.status='COMPLETED'
BEGIN SELECT RAISE(ABORT, 'completed trade reviews are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_completed_trade_review_no_delete
BEFORE DELETE ON trade_reviews
WHEN OLD.status='COMPLETED'
BEGIN SELECT RAISE(ABORT, 'completed trade reviews are immutable'); END;

CREATE TABLE IF NOT EXISTS mistake_types (
  mistake_type_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  mistake_group TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  user_defined INTEGER NOT NULL DEFAULT 0 CHECK(user_defined IN (0,1))
);

CREATE TABLE IF NOT EXISTS trade_mistakes (
  trade_mistake_id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(trade_id),
  review_id TEXT REFERENCES trade_reviews(review_id),
  mistake_type_id TEXT NOT NULL REFERENCES mistake_types(mistake_type_id),
  occurred_at TEXT NOT NULL,
  estimated_cost_r REAL,
  estimated_cost_dollars REAL,
  note TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE',
  UNIQUE(review_id, mistake_type_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_reviews_trade ON trade_reviews(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_trade ON trade_mistakes(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_mistakes_type ON trade_mistakes(mistake_type_id);

-- Package C: correction of a MISTAKEN recorded INITIAL risk denominator.
-- This is NOT an active stop modification or a market event.
-- The immutable original risk_snapshots row is never updated.
CREATE TABLE initial_risk_correction_events (
  correction_id TEXT PRIMARY KEY,
  risk_snapshot_id TEXT NOT NULL REFERENCES risk_snapshots(risk_snapshot_id),
  revision INTEGER NOT NULL CHECK(revision>0),
  original_risk_dollars REAL,
  previous_risk_dollars REAL,
  replacement_risk_dollars REAL NOT NULL CHECK(replacement_risk_dollars>0),
  previous_was_null INTEGER NOT NULL CHECK(previous_was_null IN (0,1)),
  expected_prior_correction_id TEXT REFERENCES initial_risk_correction_events(correction_id),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 500),
  recorded_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'LOCAL_USER' CHECK(actor='LOCAL_USER'),
  UNIQUE(risk_snapshot_id,revision),
  CHECK((previous_was_null=1 AND previous_risk_dollars IS NULL)
       OR (previous_was_null=0 AND previous_risk_dollars IS NOT NULL))
);
CREATE INDEX idx_initial_risk_correction_snapshot
  ON initial_risk_correction_events(risk_snapshot_id,revision);
CREATE TRIGGER initial_risk_correction_no_update
BEFORE UPDATE ON initial_risk_correction_events
BEGIN SELECT RAISE(ABORT,'original risk correction events are immutable'); END;
CREATE TRIGGER initial_risk_correction_no_delete
BEFORE DELETE ON initial_risk_correction_events
BEGIN SELECT RAISE(ABORT,'original risk correction events are immutable'); END;

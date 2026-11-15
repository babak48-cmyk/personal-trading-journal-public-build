-- Package C / approved isolated-development migration. New rows only: no
-- UPDATE or DELETE of original fills, stop/risk history or recorded decisions.
-- Corrections remain unexposed to production UI until all effective-value
-- consumers (analytics/exports/backup) and user Windows gates are verified.
CREATE TABLE IF NOT EXISTS fill_correction_events (
  correction_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES execution_fills(execution_id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  field_code TEXT NOT NULL CHECK(field_code IN ('price','quantity','commission','fees')),
  recorded_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL CHECK(actor='USER'),
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  previous_is_null INTEGER NOT NULL CHECK(previous_is_null IN (0,1)),
  previous_number REAL,
  replacement_is_null INTEGER NOT NULL CHECK(replacement_is_null IN (0,1)),
  replacement_number REAL,
  expected_prior_correction_id TEXT REFERENCES fill_correction_events(correction_id),
  CHECK((previous_is_null=1 AND previous_number IS NULL) OR
        (previous_is_null=0 AND previous_number IS NOT NULL)),
  CHECK((replacement_is_null=1 AND replacement_number IS NULL) OR
        (replacement_is_null=0 AND replacement_number IS NOT NULL)),
  UNIQUE(execution_id,field_code,revision)
);
CREATE INDEX IF NOT EXISTS idx_fill_corrections_target
  ON fill_correction_events(execution_id,field_code,revision);
CREATE TRIGGER IF NOT EXISTS trg_fill_correction_immutable_update
BEFORE UPDATE ON fill_correction_events
BEGIN SELECT RAISE(ABORT,'audited fill correction is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_fill_correction_immutable_delete
BEFORE DELETE ON fill_correction_events
BEGIN SELECT RAISE(ABORT,'audited fill correction is immutable'); END;

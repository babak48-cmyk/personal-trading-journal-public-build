-- Package C v15: non-destructive correction of the recorded historical source price.
-- This is NOT a Zone price range revision, observed market evidence or fill edit.
CREATE TABLE candidate_source_price_correction_events (
  correction_id TEXT PRIMARY KEY,
  candidate_source_id TEXT NOT NULL REFERENCES candidate_sources(candidate_source_id),
  revision INTEGER NOT NULL CHECK(revision>0),
  original_source_price REAL,
  previous_source_price REAL,
  replacement_source_price REAL NOT NULL CHECK(replacement_source_price>0),
  expected_prior_correction_id TEXT REFERENCES candidate_source_price_correction_events(correction_id),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 500),
  recorded_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'LOCAL_USER' CHECK(actor='LOCAL_USER'),
  UNIQUE(candidate_source_id,revision),
  CHECK(previous_source_price IS NULL OR previous_source_price<>replacement_source_price)
);
CREATE INDEX idx_source_price_correction_chain ON candidate_source_price_correction_events(candidate_source_id,revision);
CREATE TRIGGER source_price_correction_no_update
BEFORE UPDATE ON candidate_source_price_correction_events
BEGIN SELECT RAISE(ABORT,'historical source price correction events are immutable'); END;
CREATE TRIGGER source_price_correction_no_delete
BEFORE DELETE ON candidate_source_price_correction_events
BEGIN SELECT RAISE(ABORT,'historical source price correction events are immutable'); END;

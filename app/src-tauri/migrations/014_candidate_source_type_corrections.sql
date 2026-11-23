-- Package C v14: historical transcription correction for level-source TYPE.
-- Never update original candidate_sources or decision/revision links.
CREATE TABLE candidate_source_type_correction_events (
  correction_id TEXT PRIMARY KEY,
  candidate_source_id TEXT NOT NULL REFERENCES candidate_sources(candidate_source_id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  original_source_type_id TEXT NOT NULL REFERENCES level_source_types(source_type_id),
  previous_source_type_id TEXT NOT NULL REFERENCES level_source_types(source_type_id),
  replacement_source_type_id TEXT NOT NULL REFERENCES level_source_types(source_type_id),
  expected_prior_correction_id TEXT REFERENCES candidate_source_type_correction_events(correction_id),
  reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 500),
  recorded_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'LOCAL_USER' CHECK(actor = 'LOCAL_USER'),
  UNIQUE(candidate_source_id, revision),
  CHECK(previous_source_type_id <> replacement_source_type_id)
);
CREATE INDEX idx_source_type_correction_source
  ON candidate_source_type_correction_events(candidate_source_id, revision);
CREATE TRIGGER source_type_correction_no_update
BEFORE UPDATE ON candidate_source_type_correction_events
BEGIN SELECT RAISE(ABORT,'historical source correction events are immutable'); END;
CREATE TRIGGER source_type_correction_no_delete
BEFORE DELETE ON candidate_source_type_correction_events
BEGIN SELECT RAISE(ABORT,'historical source correction events are immutable'); END;
ALTER TABLE candidate_decisions ADD COLUMN intended_direction TEXT CHECK(intended_direction IN ('LONG','SHORT') OR intended_direction IS NULL);
ALTER TABLE candidate_decisions ADD COLUMN plan_alignment TEXT CHECK(plan_alignment IN ('ALIGNED','PLANNED_COUNTERTREND','MISMATCH','UNPLANNED','NOT_APPLICABLE','UNKNOWN') OR plan_alignment IS NULL);
ALTER TABLE candidate_decisions ADD COLUMN plan_mismatch_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_decisions_alignment ON candidate_decisions(plan_alignment);

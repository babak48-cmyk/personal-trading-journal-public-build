import {describe,it,expect} from 'vitest';
import {blankSetupDraft,setupDraftFromVersion,setupSwitchDraft} from './setupDraftLifecycle';
import type {SetupVersion} from './services/localApi';

const version:SetupVersion={
 setup_id:'setup-original',version_id:'version-01',version_number:1,
 name:'Rejection at Value Boundary',source_trade_id:'trade-x',
 market_context:'ranging',zone_location:'prior day VAH',
 prerequisites:'prior level known',entry_triggers:'observed rejection',
 supporting_evidence:null,contrary_evidence:'break above level',
 thesis_invalidation:'sustained acceptance above',notes:'original text',
 evidence_priorities:[{evidence_label:'DOM',priority_role:'SUPPORTING',explanation:'context'}],
 is_active:true,is_approved:true,created_at:'2026-11-17T00:00:00Z',
};
describe('Package A Setup editor immutable version selection',()=>{
 it('blank or missing version ID creates a truly independent empty draft',()=>{
  for(const id of ['', 'version-deleted']){
   const switched=setupSwitchDraft([version],id);
   expect(switched.selectedVersion).toBe('');
   expect(switched.draft).toEqual(blankSetupDraft());
   expect(switched.draft.setup_id).toBeNull();
   expect(switched.draft.source_trade_id).toBeNull();
   expect(switched.draft.evidence_priorities).toEqual([]);
  }
 });
 it('selecting an existing version keeps its original Setup identity for an explicit NEW revision',()=>{
  const switched=setupSwitchDraft([version],version.version_id);
  expect(switched.selectedVersion).toBe(version.version_id);
  expect(switched.draft.setup_id).toBe(version.setup_id);
  expect(switched.draft.name).toBe(version.name);
  expect(switched.draft.approve).toBe(false);
 });
 it('draft edits never mutate the selected saved version or its evidence snapshots',()=>{
  const draft=setupDraftFromVersion(version);
  draft.evidence_priorities[0].evidence_label='OTHER';
  draft.notes='new draft note';
  expect(version.notes).toBe('original text');
  expect(version.evidence_priorities[0].evidence_label).toBe('DOM');
  expect(setupDraftFromVersion(version).evidence_priorities[0].evidence_label).toBe('DOM');
 });
});

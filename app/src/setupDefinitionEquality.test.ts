import {describe,it,expect} from 'vitest';
import {sameSetupDefinition} from './setupDefinitionEquality';
import type {SaveSetupVersionInput,SetupVersion} from './services/localApi';
const saved:SetupVersion={
 setup_id:'setup-a',version_id:'v1',version_number:1,is_active:true,is_approved:true,created_at:'2026-11-17T00:00:00Z',
 name:'Rejection',source_trade_id:null,market_context:'Range',zone_location:'Value low',
 prerequisites:'Zone tested',entry_triggers:'Reclaim',supporting_evidence:'Delta',
 contrary_evidence:'Acceptance',thesis_invalidation:'Thesis failed',notes:null,
 evidence_priorities:[{evidence_label:'DOM Pressure',priority_role:'REQUIRED',explanation:null}]
};
const draft=(approve=true):SaveSetupVersionInput=>({
 setup_id:saved.setup_id,name:saved.name,source_trade_id:saved.source_trade_id,
 market_context:saved.market_context,zone_location:saved.zone_location,
 prerequisites:saved.prerequisites,entry_triggers:saved.entry_triggers,
 supporting_evidence:saved.supporting_evidence,contrary_evidence:saved.contrary_evidence,
 thesis_invalidation:saved.thesis_invalidation,notes:saved.notes,
 evidence_priorities:saved.evidence_priorities.map(x=>({...x})),approve:false
});
describe('Group10 semantic Setup version comparison',()=>{
 it('blocks repeated identical approval despite harmless edge whitespace',()=>{
  const x=draft();x.name='  Rejection ';x.notes=' ';
  expect(sameSetupDefinition(x,saved,true)).toBe(true);
 });
 it('allows changed evidence role, changed conditions, or draft-to-approval transition',()=>{
  const x=draft();x.evidence_priorities[0].priority_role='CONTRADICTORY';
  expect(sameSetupDefinition(x,saved,true)).toBe(false);
  x.evidence_priorities[0].priority_role='REQUIRED';x.entry_triggers='Breakdown';
  expect(sameSetupDefinition(x,saved,true)).toBe(false);
  expect(sameSetupDefinition(draft(),saved,false)).toBe(false);
 });
 it('does not confuse different Setup IDs or missing evidence rows',()=>{
  const x=draft();x.setup_id='different';
  expect(sameSetupDefinition(x,saved,true)).toBe(false);
  const y=draft();y.evidence_priorities=[];
  expect(sameSetupDefinition(y,saved,true)).toBe(false);
 });
});

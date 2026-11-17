import {describe,expect,it} from 'vitest';
import {verifiedSetupSaveVersion} from './setupSaveReadback';
import type {SetupVersion} from './services/localApi';
const version=(versionId:string,versionNumber:number):SetupVersion=>({
 setup_id:'setup-1',version_id:versionId,version_number:versionNumber,
 name:'Rejection',source_trade_id:null,market_context:'range',
 zone_location:'VAH',prerequisites:'preconditions',entry_triggers:'rejection',
 supporting_evidence:null,contrary_evidence:'conflict',
 thesis_invalidation:'acceptance above',notes:null,
 evidence_priorities:[],is_active:true,is_approved:false,created_at:'2026-11-17T00:00:00Z'
});
describe('Package A immutable Setup save readback',()=>{
 it('only accepts exactly returned new version ID, not same name or same setup family',()=>{
  const older=version('v1',1),saved=version('v2',2);
  expect(verifiedSetupSaveVersion([older,saved],'v2')).toEqual(saved);
  expect(verifiedSetupSaveVersion([older],'v2')).toBeNull();
  expect(verifiedSetupSaveVersion([older,saved],null)).toBeNull();
  expect(verifiedSetupSaveVersion([older,saved],'')).toBeNull();
  expect(verifiedSetupSaveVersion([older,saved],'unknown')).toBeNull();
 });
 it('does not fabricate a verified write for an ambiguous response',()=>{
  expect(verifiedSetupSaveVersion([version('v9',9)],null)).toBeNull();
 });
});

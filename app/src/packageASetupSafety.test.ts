import {describe,it,expect} from 'vitest';
import {hasPendingSetupEvidence} from './pendingSetupEvidence';
import {FIELD_CONTROL_INVENTORY,fieldConnectionReport,isFieldPresented} from './fieldInventory';

describe('Package A Setup Playbook lifecycle and pending evidence safety',()=>{
 it('does not silently save unfinished evidence role or help',()=>{
  expect(hasPendingSetupEvidence('','','')).toBe(true); // absent role is not a valid selected role
  expect(hasPendingSetupEvidence('','SUPPORTING','')).toBe(false);
  expect(hasPendingSetupEvidence('','REQUIRED','')).toBe(true);
  expect(hasPendingSetupEvidence('','CONTRADICTORY','')).toBe(true);
  expect(hasPendingSetupEvidence('  ','SUPPORTING',' explanation ')).toBe(true);
  expect(hasPendingSetupEvidence('DOM','SUPPORTING','')).toBe(true);
 });
 it('inventories every versioned Setup input without falsely exposing unverified Field Manager actions',()=>{
  const playbook=FIELD_CONTROL_INVENTORY.filter(row=>row.stage==='setup-playbook');
  expect(playbook).toHaveLength(13);
  expect(new Set(playbook.map(row=>row.id)).size).toBe(playbook.length);
  const statuses=fieldConnectionReport();
  expect(statuses.find(row=>row.id==='setup.name')?.status).toBe('PROTECTED');
  expect(statuses.find(row=>row.id==='setup.evidenceRole')?.status).toBe('PROTECTED');
  expect(statuses.find(row=>row.id==='setup.entryTriggers')?.status).toBe('PENDING');
  expect(isFieldPresented('setup.entryTriggers',true,{'setup.entryTriggers':false},{'setup.entryTriggers':'DETAILED_ONLY'},{'setup.entryTriggers':true})).toBe(true);
 });
});

import {describe,expect,it} from 'vitest';
import {FIELD_DEFINITION_BY_ID,isUserRequired} from './fieldDefinitions';
import {
  FIELD_CONTROL_INVENTORY,activeVisibilityInventoryIssues,
  fieldConnectionReport,isFieldPresented,requiredPresentationIssues
} from './fieldInventory';

const optionalSetup=['setup.sourceTrade','setup.notes','setup.evidenceHelp'] as const;
const protectedSetup=['setup.name','setup.evidenceName','setup.evidenceRole'] as const;
const approvalCriticalSetup=[
  'setup.marketContext','setup.zoneLocation','setup.prerequisites',
  'setup.entryTriggers','setup.supportingEvidence','setup.contraryEvidence','setup.invalidation'
] as const;

describe('Package A: real Setup Playbook Field Manager integration',()=>{
  it.each(optionalSetup)('%s is connected, optional and safely configurable in both modes',id=>{
    expect(FIELD_CONTROL_INVENTORY.find(field=>field.id===id)?.stage).toBe('setup-playbook');
    expect(fieldConnectionReport().find(field=>field.id===id)?.status).toBe('CONNECTED');
    expect(FIELD_DEFINITION_BY_ID[id]?.requirementManaged).toBe(false);
    expect(isUserRequired(id,{[id]:true})).toBe(false);
    expect(isFieldPresented(id,true,{}, {},{})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{})).toBe(false);
    expect(isFieldPresented(id,false,{[id]:true},{[id]:'DETAILED_ONLY'},{})).toBe(true);
    expect(isFieldPresented(id,false,{[id]:false},{},{})).toBe(false);
    // Force-show an unfinished draft so the user can see and complete it;
    // this is independent of approval-required rules or persisted values.
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{},true)).toBe(true);
  });
  it('never hides approval-critical Setup definition fields or structural evidence roles',()=>{
    for(const id of [...protectedSetup,...approvalCriticalSetup]){
      expect(fieldConnectionReport().find(field=>field.id===id)?.status)
        .toMatch(/PROTECTED|PENDING/);
      expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{})).toBe(true);
    }
    expect(activeVisibilityInventoryIssues()).toEqual([]);
    expect(requiredPresentationIssues({},Object.fromEntries(optionalSetup.map(id=>[id,false])),{})).toEqual([]);
  });
});

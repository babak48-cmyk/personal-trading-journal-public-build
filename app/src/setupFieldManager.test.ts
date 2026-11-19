import {describe,it,expect} from 'vitest';
import {blankSetupDraft} from './setupDraftLifecycle';
import {SETUP_DEFINITION_FIELDS,SETUP_DEFINITION_FIELD_IDS,orderedSetupDefinitionFields,setupApprovalMissingFields,setupApprovalActionFeedback} from './setupFieldManager';
import {FIELD_CONTROL_INVENTORY,fieldConnectionReport,isFieldPresented,RENDERED_FIELD_TEXT_IDS,isActiveVisibilityControl} from './fieldInventory';
import {FIELD_DEFINITION_BY_ID} from './fieldDefinitions';
import {managerOrderPosition} from './fieldManagerOrdering';

describe('Package A protected versioned Setup field manager',()=>{
 it('preserves seven correct immutable Setup keys and actual Rust approval semantics',()=>{
  expect(SETUP_DEFINITION_FIELDS.map(f=>f.key)).toEqual([
   'market_context','zone_location','prerequisites','entry_triggers',
   'supporting_evidence','contrary_evidence','thesis_invalidation'
  ]);
  expect(SETUP_DEFINITION_FIELDS.filter(f=>f.approvalRequired).length).toBe(6);
  expect(setupApprovalMissingFields(blankSetupDraft())).toEqual(SETUP_DEFINITION_FIELD_IDS.filter(id=>id!=='setup.supportingEvidence'));
  const full={...blankSetupDraft(),market_context:'range',zone_location:'VAH',
   prerequisites:'known level',entry_triggers:'rejection',contrary_evidence:'acceptance',
   thesis_invalidation:'sustained breakout'};
  expect(setupApprovalMissingFields(full)).toEqual([]);
  expect(setupApprovalMissingFields({...full,contrary_evidence:'   '})).toEqual(['setup.contraryEvidence']);
  expect(setupApprovalMissingFields({...full,supporting_evidence:null})).toEqual([]);
 });
 it('shows field-specific, configured-label validation for incomplete approval; draft remains permissible',()=>{
  const blank=blankSetupDraft();
  const message=setupApprovalActionFeedback(blank,(id,fallback)=>id==='setup.marketContext'?'Market Context TEST':fallback);
  expect(message).toContain('6 required Setup definition field(s)');
  expect(message).toContain('Market Context TEST');
  expect(message).toContain('Draft save remains available');
  const ready={...blank,market_context:'range',zone_location:'VAH',
    prerequisites:'known level',entry_triggers:'observed rejection',
    contrary_evidence:'acceptance',thesis_invalidation:'thesis invalidation'};
  expect(setupApprovalActionFeedback(ready,(_,fallback)=>fallback)).toBeNull();
  expect(setupApprovalActionFeedback({...ready,entry_triggers:'   '},(_,fallback)=>fallback))
    .toContain('1 required Setup definition field(s): Critical entry triggers');
 });
 it.each(SETUP_DEFINITION_FIELD_IDS)('%s has editable label/help and order but NEVER a hide/placement/required toggle',(id)=>{
  expect(FIELD_CONTROL_INVENTORY.find(f=>f.id===id)?.formalFieldId).toBe(id);
  expect(fieldConnectionReport().find(f=>f.id===id)?.status).toBe('PROTECTED');
  expect(FIELD_DEFINITION_BY_ID[id]?.systemLocked).toBe(true);
  expect(FIELD_DEFINITION_BY_ID[id]?.requirementManaged).toBe(false);
  expect(RENDERED_FIELD_TEXT_IDS).toContain(id);
  expect(isActiveVisibilityControl(id)).toBe(false);
  expect(managerOrderPosition(id,{})).not.toBeNull();
  for(const quickMode of [true,false]){
   expect(isFieldPresented(id,quickMode,{[id]:false},{[id]:'DETAILED_ONLY'},{})).toBe(true);
  }
 });
 it('reorders only Setup definition display, without editing the original stored value object',()=>{
  const ranks={'setup.invalidation':0,'setup.marketContext':1};
  const arranged=orderedSetupDefinitionFields(ranks).map(f=>f.id);
  expect(arranged[0]).toBe('setup.invalidation');
  expect(arranged[1]).toBe('setup.marketContext');
  expect(new Set(arranged)).toEqual(new Set(SETUP_DEFINITION_FIELD_IDS));
  const draft={...blankSetupDraft(),market_context:'saved',thesis_invalidation:'invalidated'};
  orderedSetupDefinitionFields(ranks);
  expect(draft.market_context).toBe('saved');
  expect(draft.thesis_invalidation).toBe('invalidated');
 });
});

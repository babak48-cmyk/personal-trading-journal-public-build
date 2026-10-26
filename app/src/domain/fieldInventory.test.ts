import { describe, expect, it } from 'vitest';
import { FIELD_DEFINITIONS } from '../fieldDefinitions';
import {
  FIELD_CONTROL_INVENTORY, duplicateInventoryIds, unknownFormalFieldIds, resolveFieldVisibility, ACTIVE_VISIBILITY_FIELD_IDS, isActiveVisibilityControl, isFieldShown, isFieldInMode, isFieldPresented
} from '../fieldInventory';

describe('Field Manager inventory safeguards',()=>{
  it('has unique nonempty stable control IDs and descriptions',()=>{
    expect(duplicateInventoryIds()).toEqual([]);
    for(const row of FIELD_CONTROL_INVENTORY){
      expect(row.id.trim()).not.toBe('');
      expect(row.label.trim()).not.toBe('');
    }
  });

  it('references only canonical field definitions',()=>{
    expect(unknownFormalFieldIds()).toEqual([]);
  });

  it('covers all existing formally registered fields exactly once',()=>{
    for(const def of FIELD_DEFINITIONS){
      expect(FIELD_CONTROL_INVENTORY.filter(row=>row.formalFieldId===def.id),
        `missing/duplicate inventory coverage: ${def.id}`).toHaveLength(1);
    }
  });

  it('protects canonical system-required fields from customization',()=>{
    for(const def of FIELD_DEFINITIONS.filter(x=>x.defaultRequirement==='SYSTEM_REQUIRED')){
      const row=FIELD_CONTROL_INVENTORY.find(x=>x.formalFieldId===def.id);
      expect(row?.candidateForCustomization,`system field ${def.id}`).toBe(false);
      expect(row?.protectedReason?.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps analytics filters and registry settings separate from trade-record fields',()=>{
    for(const row of FIELD_CONTROL_INVENTORY.filter(x=>x.category==='analytics-filter'||x.category==='registry-setting')){
      expect(row.stage==='analytics'||row.stage==='settings').toBe(true);
      expect(row.formalFieldId).toBeUndefined();
    }
  });

  it('does not silently unlock conditionally required trade geometry and decision reasons',()=>{
    for(const id of ['candidate.price','decision.reason','trade.entryPrice','trade.stopPrice','trade.quantity']){
      const row=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
      expect(row?.candidateForCustomization).toBe(false);
      expect(row?.protectedReason?.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('prospective field visibility is fail-open and requirement-safe',()=>{
  it('allows hiding an eligible optional field only when not required',()=>{
    expect(resolveFieldVisibility('plan.mainScenario',false,{})).toBe(false);
    expect(resolveFieldVisibility('plan.mainScenario',false,{'plan.mainScenario':true})).toBe(true);
  });
  it('never hides system or protected calculation fields',()=>{
    expect(resolveFieldVisibility('trade.entryPrice',false,{})).toBe(true);
    expect(resolveFieldVisibility('session.date',false,{})).toBe(true);
    expect(resolveFieldVisibility('candidate.price',false,{})).toBe(true);
  });
  it('protects system-locked conditional fields regardless of display preference',()=>{
    expect(resolveFieldVisibility('psychology.state',false,{},true)).toBe(true);
    expect(resolveFieldVisibility('psychology.state',false,{},false)).toBe(true); // Current frozen field definition is systemLocked; visibility stays protected.
  });
  it('supports optional pre-session intensity without overriding required fields',()=>{
    expect(resolveFieldVisibility('plan.preSessionStateIntensity',false,{})).toBe(false);
    expect(resolveFieldVisibility('plan.preSessionStateIntensity',true,{})).toBe(true);
    expect(resolveFieldVisibility('plan.preSessionState',false,{'plan.preSessionState':true})).toBe(true);
  });
    it('allows zone label hide but protects locked trend relationship',()=>{
    expect(resolveFieldVisibility('candidate.label',false,{})).toBe(false);
    expect(resolveFieldVisibility('candidate.trendRelationship',false,{})).toBe(true);
    expect(resolveFieldVisibility('candidate.trendRelationship',false,{'candidate.trendRelationship':true})).toBe(true);
  });
  it('hides eligible optional plan and zone inputs but not user-required values',()=>{
    for(const id of ['plan.preSessionState','candidate.requiredConditions','candidate.invalidationConditions']){
      expect(resolveFieldVisibility(id,false,{}),id).toBe(false);
      expect(resolveFieldVisibility(id,false,{[id]:true}),id).toBe(true);
    }
  });
  it('fails open when a UI field is not yet inventoried',()=>{
    expect(resolveFieldVisibility('unknown.futureField',false,{})).toBe(true);
  });
});

describe('integration visibility safety for pre-session state',()=>{
  it('preserves user-required pre-session state despite hide preference',()=>{
    expect(isFieldShown('plan.preSessionState',{'plan.preSessionState':false},{})).toBe(false);
    expect(isFieldShown('plan.preSessionState',{'plan.preSessionState':false},{'plan.preSessionState':true})).toBe(true);
  });
});

describe('centralized visibility integration',()=>{
  it('only activates known eligible unlocked fields',()=>{
    for(const id of ACTIVE_VISIBILITY_FIELD_IDS){
      expect(isActiveVisibilityControl(id),id).toBe(true);
      expect(FIELD_CONTROL_INVENTORY.filter(row=>row.id===id)).toHaveLength(1);
    }
    expect(isActiveVisibilityControl('candidate.trendRelationship')).toBe(false);
    expect(isActiveVisibilityControl('trade.entryPrice')).toBe(false);
  });
  it('uses visible defaults and fails open for unconnected fields',()=>{
    expect(isFieldShown('plan.mainScenario',{},{})).toBe(true);
    expect(isFieldShown('candidate.trendRelationship',{'candidate.trendRelationship':false},{})).toBe(true);
    expect(isFieldShown('unregistered.input',{'unregistered.input':false},{})).toBe(true);
  });
  it('keeps hidden preferences from overriding required rules',()=>{
    const preferences={'candidate.requiredConditions':false,'plan.mainScenario':false};
    expect(isFieldShown('candidate.requiredConditions',preferences,{})).toBe(false);
    expect(isFieldShown('candidate.requiredConditions',preferences,{'candidate.requiredConditions':true})).toBe(true);
    expect(isFieldShown('plan.mainScenario',preferences,{},true)).toBe(true);
  });
});

describe('cross-stage optional field visibility',()=>{
  it('supports optional evidence, decision and review fields without changing values',()=>{
    for(const id of ['evidence.price','evidence.note','decision.note','review.note']){
      expect(isActiveVisibilityControl(id),id).toBe(true);
      expect(isFieldShown(id,{},{}),id).toBe(true);
      expect(isFieldShown(id,{[id]:false},{}),id).toBe(false);
      expect(isFieldShown(id,{[id]:false},{},true),id).toBe(true);
    }
  });
});

describe('Quick/Detailed shared safety policy',()=>{
  it('keeps current Quick defaults without settings',()=>{
    expect(isFieldInMode('plan.mainScenario',true,{},{})).toBe(true);
    expect(isFieldInMode('plan.mainScenario',false,{},{})).toBe(true);
  });
  it('places optional fields in Detailed without destroying their values',()=>{
    const placement={'plan.mainScenario':'DETAILED_ONLY'} as const;
    expect(isFieldInMode('plan.mainScenario',true,placement,{})).toBe(false);
    expect(isFieldInMode('plan.mainScenario',false,placement,{})).toBe(true);
  });
  it('never removes user-required or conditionally required fields from Quick',()=>{
    const placement={'candidate.requiredConditions':'DETAILED_ONLY'} as const;
    expect(isFieldInMode('candidate.requiredConditions',true,placement,{'candidate.requiredConditions':true})).toBe(true);
    expect(isFieldInMode('candidate.requiredConditions',true,placement,{},true)).toBe(true);
  });
  it('fails open on unknown controls and protected fields',()=>{
    expect(isFieldInMode('unknown.control',true,{'unknown.control':'DETAILED_ONLY'},{})).toBe(true);
    expect(isFieldInMode('candidate.price',true,{'candidate.price':'DETAILED_ONLY'},{})).toBe(true);
  });
  it('composes visibility and placement consistently',()=>{
    expect(isFieldPresented('plan.mainScenario',true,{'plan.mainScenario':false},{},{})).toBe(false);
    expect(isFieldPresented('plan.mainScenario',true,{'plan.mainScenario':false},{'plan.mainScenario':'DETAILED_ONLY'},{'plan.mainScenario':true})).toBe(true);
  });
});

describe('guided Zone mode-placement regressions',()=>{
  it('keeps entry and invalidation conditions visible in Quick when user-required',()=>{
    for(const id of ['candidate.requiredConditions','candidate.invalidationConditions']){
      const placement={[id]:'DETAILED_ONLY'} as const;
      expect(isFieldPresented(id,true,{},placement,{}),id).toBe(false);
      expect(isFieldPresented(id,true,{},placement,{[id]:true}),id).toBe(true);
      expect(isFieldPresented(id,true,{[id]:false},placement,{[id]:true}),id).toBe(true);
      expect(isFieldPresented(id,false,{},placement,{}),id).toBe(true);
    }
  });
});

describe('cross-stage Quick/Detailed integration policy',()=>{
  it('supports optional Evidence, Decision and Review in Detailed while keeping defaults in Quick',()=>{
    for(const id of ['evidence.price','evidence.note','decision.note','review.note']){
      const placements:{[key:string]:'DETAILED_ONLY'}={[id]:'DETAILED_ONLY'};
      expect(isFieldPresented(id,true,{}, {}, {}),id).toBe(true);
      expect(isFieldPresented(id,true,{},placements,{}),id).toBe(false);
      expect(isFieldPresented(id,false,{},placements,{}),id).toBe(true);
      expect(isFieldPresented(id,true,{[id]:false},placements,{},true),id).toBe(true);
    }
  });
});

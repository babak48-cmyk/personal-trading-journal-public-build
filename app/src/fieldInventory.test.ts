import { describe, expect, it } from 'vitest';
import {
  FIELD_CONTROL_INVENTORY,
  duplicateInventoryIds,
  unknownFormalFieldIds,
  resolveFieldVisibility,
  activeVisibilityInventoryIssues,
  isFieldPresented,
  orderFieldIdsWithinSection,
  fieldConnectionReport,
  fieldConnectionSummary,
  requiredPresentationIssues,
} from './fieldInventory';

describe('Field Manager inventory safety', () => {
  it('has unique control identifiers and only valid formal references', () => {
    expect(duplicateInventoryIds()).toEqual([]);
    expect(unknownFormalFieldIds()).toEqual([]);
  });

  it('covers Instrument Manager display name without misclassifying it as editable journal data', () => {
    const displayName = FIELD_CONTROL_INVENTORY.find((item) => item.id === 'instrument.displayName');
    expect(displayName).toMatchObject({
      stage: 'settings',
      category: 'registry-setting',
      candidateForCustomization: false,
    });
  });

  it('tracks conditional trade direction separately from immutable decision type', () => {
    expect(FIELD_CONTROL_INVENTORY.find((item) => item.id === 'decision.direction')).toMatchObject({
      stage: 'decision',
      category: 'conditional-journal-field',
      candidateForCustomization: false,
    });
    expect(FIELD_CONTROL_INVENTORY.find((item) => item.id === 'decision.type')?.protectedReason).toBeTruthy();
  });

  it('covers the overall assessment shown in session review', () => {
    expect(FIELD_CONTROL_INVENTORY.find((item) => item.id === 'sessionReview.overall')).toMatchObject({
      stage: 'session-review',
      category: 'journal-field',
    });
  });

  it('records button-based zone status as a protected lifecycle control', () => {
    expect(FIELD_CONTROL_INVENTORY.find((item) => item.id === 'candidate.status')).toMatchObject({
      stage: 'zone',
      category: 'conditional-journal-field',
      candidateForCustomization: false,
    });
    expect(resolveFieldVisibility('candidate.status', false, {})).toBe(true);
  });

  it('keeps conditional rule selection visible when a violation is reported', () => {
    expect(FIELD_CONTROL_INVENTORY.find(x => x.id === 'rule.violatedIds')).toMatchObject({
      stage: 'post-trade-review',
      category: 'conditional-journal-field',
      candidateForCustomization: false,
    });
    expect(resolveFieldVisibility('rule.violatedIds', false, {}, true)).toBe(true);
  });

  it('classifies exit, mistakes and rule controls without turning them into active visibility switches', () => {
    for (const id of ['review.exitReason', 'review.exitNote', 'review.mistakes', 'rule.note']) {
      expect(FIELD_CONTROL_INVENTORY.find(x => x.id === id)?.stage).toBe('post-trade-review');
    }
    expect(FIELD_CONTROL_INVENTORY.find(x => x.id === 'rule.violationReported')?.candidateForCustomization).toBe(false);
  });

  it('protects conditional psychology state even if optional control preferences hide it', () => {
    expect(resolveFieldVisibility('psychology.state', false, {}, true)).toBe(true);
    expect(resolveFieldVisibility('psychology.stage', false, {}, true)).toBe(true);
    expect(resolveFieldVisibility('psychology.emotionAffected', false, {})).toBe(true);
  });

  it('never permits optional visibility preferences to hide required-by-user fields', () => {
    expect(resolveFieldVisibility('plan.mainScenario', false, {'plan.mainScenario': true})).toBe(true);
    expect(resolveFieldVisibility('candidate.requiredConditions', false, {'candidate.requiredConditions': true})).toBe(true);
  });

  it('hides only eligible optional fields when no requirement applies', () => {
    expect(resolveFieldVisibility('plan.mainScenario', false, {})).toBe(false);
    expect(resolveFieldVisibility('trade.entryPrice', false, {})).toBe(true);
  });

  it('keeps the active Settings list synchronized with eligible inventory entries', () => {
    expect(activeVisibilityInventoryIssues()).toEqual([]);
  });

  it('makes user-required fields visible in Quick despite hide and Detailed-only preferences', () => {
    expect(isFieldPresented('plan.mainScenario', true,
      {'plan.mainScenario':false}, {'plan.mainScenario':'DETAILED_ONLY'},
      {'plan.mainScenario':true})).toBe(true);
  });

  it('keeps required level provenance visible while allowing optional Detailed-only placement', () => {
    const id='candidate.sources';
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(false);
    expect(isFieldPresented(id,true,{}, {[id]:'DETAILED_ONLY'},{})).toBe(false);
    expect(isFieldPresented(id,false,{}, {[id]:'DETAILED_ONLY'},{})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{},{})).toBe(false);
  });

  it('keeps Plan scenario order configurable with the original order as default', () => {
    const ids=['plan.mainScenario','plan.alternativeScenario'];
    expect(orderFieldIdsWithinSection(ids,{})).toEqual(ids);
    expect(orderFieldIdsWithinSection(ids,{'plan.mainScenario':1,'plan.alternativeScenario':0})).toEqual([...ids].reverse());
  });

  it('keeps system and conditional Zone price controls visible in Quick regardless of optional preferences', () => {
    for (const id of ['candidate.priceMode','candidate.price','candidate.intent','plan.bias']) {
      expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{})).toBe(true);
    }
    expect(isFieldPresented('candidate.price',true,{'candidate.price':false},
      {'candidate.price':'DETAILED_ONLY'},{},true)).toBe(true);
  });

  it('does not conceal Zone provenance if the user requires it in Quick or Detailed', () => {
    for (const quick of [true,false]) {
      expect(isFieldPresented('candidate.sources',quick,{'candidate.sources':false},
        {'candidate.sources':'DETAILED_ONLY'},{'candidate.sources':true})).toBe(true);
    }
  });

  it('reorders existing Zone condition prompts without inventing fields', () => {
    const ids=['candidate.requiredConditions','candidate.invalidationConditions'];
    expect(orderFieldIdsWithinSection(ids,{})).toEqual(ids);
    expect(orderFieldIdsWithinSection(ids,{
      'candidate.requiredConditions':1,
      'candidate.invalidationConditions':0,
    })).toEqual([...ids].reverse());
    expect(orderFieldIdsWithinSection(ids,{})).toEqual(ids);
  });

  it('makes conditionally required controls visible in Quick regardless of preferences', () => {
    expect(isFieldPresented('candidate.requiredConditions', true,
      {'candidate.requiredConditions':false},
      {'candidate.requiredConditions':'DETAILED_ONLY'}, {}, true)).toBe(true);
  });

  it('preserves elective Detailed-only preference for optional fields', () => {
    expect(isFieldPresented('plan.alternativeScenario', true, {},
      {'plan.alternativeScenario':'DETAILED_ONLY'}, {})).toBe(false);
    expect(isFieldPresented('plan.alternativeScenario', false, {},
      {'plan.alternativeScenario':'DETAILED_ONLY'}, {})).toBe(true);
  });

  it('allows optional exit metadata to be hidden without changing effective records', () => {
    for(const id of ['review.exitReason','review.exitNote']){
      expect(FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.candidateForCustomization).toBe(true);
      expect(isFieldPresented(id, true, {[id]:false}, {}, {})).toBe(false);
      expect(isFieldPresented(id, false, {[id]:true}, {}, {})).toBe(true);
    }
  });

  it('never hides mandatory trade facts when optional exit metadata is hidden', () => {
    expect(isFieldPresented('trade.entryPrice', true, {'trade.entryPrice':false},
      {'trade.entryPrice':'DETAILED_ONLY'}, {})).toBe(true);
    expect(isFieldPresented('trade.stopPrice', true, {'trade.stopPrice':false},
      {'trade.stopPrice':'DETAILED_ONLY'}, {})).toBe(true);
  });

  it('lets the optional rule note be hidden without hiding the rule violation controls', () => {
    expect(isFieldPresented('rule.note', true, {'rule.note':false}, {}, {})).toBe(false);
    expect(isFieldPresented('rule.violationReported', true, {'rule.violationReported':false}, {}, {})).toBe(true);
    expect(isFieldPresented('rule.violatedIds', true, {'rule.violatedIds':false}, {}, {}, true)).toBe(true);
  });

  it('supports optional extended session-review fields without hiding stored mandatory identity', () => {
    for (const id of ['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning']) {
      expect(FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.stage).toBe('session-review');
      expect(isFieldPresented(id,true,{[id]:false},{},{})).toBe(false);
      expect(isFieldPresented(id,false,{[id]:true},{},{})).toBe(true);
    }
    expect(isFieldPresented('session.instrument',true,{'session.instrument':false},{},{})).toBe(true);
  });

  it('does not treat unmapped session reflections as formally user-required', () => {
    for (const id of ['sessionReview.wentWell','sessionReview.nextImprovement']) {
      expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
      expect(isFieldPresented(id,true,{[id]:false},{},{})).toBe(false);
    }
  });

  it('orders within a section without mutating source or crossing stages', () => {
    const original=['sessionReview.wentWell','sessionReview.nextImprovement','sessionReview.overall'];
    const ordered=orderFieldIdsWithinSection(original,{
      'sessionReview.nextImprovement':0,
      'sessionReview.wentWell':1,
    });
    expect(ordered).toEqual(['sessionReview.nextImprovement','sessionReview.wentWell','sessionReview.overall']);
    expect(original[0]).toBe('sessionReview.wentWell');
  });

  it('keeps original order when ranks are invalid or tied', () => {
    const ids=['a','b','c'];
    expect(orderFieldIdsWithinSection(ids,{a:-1,b:Number.NaN,c:0})).toEqual(['c','a','b']);
    expect(orderFieldIdsWithinSection(ids,{a:1,b:1})).toEqual(ids);
  });

  it('persists stable order semantics for up and down moves', () => {
    const ids=['sessionReview.wentWell','sessionReview.nextImprovement'];
    const reordered=orderFieldIdsWithinSection(ids,{'sessionReview.nextImprovement':0,'sessionReview.wentWell':1});
    expect(reordered).toEqual(['sessionReview.nextImprovement','sessionReview.wentWell']);
    expect(orderFieldIdsWithinSection(ids,Object.fromEntries(reordered.map((id,index)=>[id,index])))).toEqual(reordered);
    expect(ids).toEqual(['sessionReview.wentWell','sessionReview.nextImprovement']);
  });

  it('fails open when a user-facing control is missing from inventory', () => {
    expect(resolveFieldVisibility('unmapped.futureControl', false, {})).toBe(true);
  });

  it('keeps protected instrument identity controls visible', () => {
    expect(resolveFieldVisibility('session.instrument', false, {})).toBe(true);
  });
});

describe('All-input connection audit and mandatory presentation invariants', () => {
  it('classifies every inventory control exactly once without claiming pending fields are wired', () => {
    const report=fieldConnectionReport();
    const summary=fieldConnectionSummary();
    expect(report).toHaveLength(FIELD_CONTROL_INVENTORY.length);
    expect(new Set(report.map(x=>x.id)).size).toBe(report.length);
    expect(summary.CONNECTED+summary.VISIBILITY_ONLY+summary.PROTECTED+summary.PENDING).toBe(report.length);
    expect(report.find(x=>x.id==='candidate.trendRelationship')?.status).toBe('PROTECTED');
    expect(report.find(x=>x.id==='review.decisionQuality')?.status).toBe('CONNECTED');
    expect(report.find(x=>x.id==='evidence.direction')?.status).toBe('CONNECTED');
  });

  it('never conceals user-required, system-required or active conditional fields in Quick or Detailed', () => {
    const overrides={'plan.mainScenario':true,'candidate.sources':true};
    const hidden=Object.fromEntries(FIELD_CONTROL_INVENTORY.map(x=>[x.id,false]));
    const detailed=Object.fromEntries(FIELD_CONTROL_INVENTORY.map(x=>[x.id,'DETAILED_ONLY' as const]));
    const conditional=new Set(['psychology.state','psychology.stage','decision.reason','candidate.price']);
    expect(requiredPresentationIssues(overrides,hidden,detailed,conditional)).toEqual([]);
  });

  it('keeps optional field preferences effective without altering underlying data', () => {
    expect(isFieldPresented('review.note',true,{'review.note':false},
      {'review.note':'DETAILED_ONLY'},{})).toBe(false);
    expect(isFieldPresented('review.note',false,{'review.note':true},
      {'review.note':'DETAILED_ONLY'},{})).toBe(true);
  });
});

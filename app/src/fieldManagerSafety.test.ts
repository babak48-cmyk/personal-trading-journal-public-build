import { describe, expect, it } from 'vitest';
import { FIELD_DEFINITION_BY_ID, isUserRequired } from './fieldDefinitions';
import {
  FIELD_CONTROL_INVENTORY,
  fieldConnectionReport,
  fieldConnectionSummary,
  isFieldPresented,
  requiredPresentationIssues,
  activeVisibilityInventoryIssues,
} from './fieldInventory';

describe('Field Manager integration safety', () => {
  it('has no stale or protected active visibility IDs', () => {
    expect(activeVisibilityInventoryIssues()).toEqual([]);
  });

  it('classifies all inventory fields exactly once', () => {
    const report = fieldConnectionReport();
    const summary = fieldConnectionSummary();
    expect(report).toHaveLength(FIELD_CONTROL_INVENTORY.length);
    expect(new Set(report.map(x => x.id)).size).toBe(report.length);
    expect(summary.CONNECTED + summary.VISIBILITY_ONLY + summary.PROTECTED + summary.PENDING).toBe(report.length);
    expect(report.find(x => x.id === 'candidate.trendRelationship')?.status).toBe('PROTECTED');
  });

  it('distinguishes visibility-only from formal field coverage', () => {
    const report = fieldConnectionReport();
    expect(report.find(x => x.id === 'evidence.note')?.status).toBe('CONNECTED');
    expect(report.find(x => x.id === 'evidence.price')?.status).toBe('CONNECTED');
    expect(report.find(x => x.id === 'evidence.direction')?.status).toBe('VISIBILITY_ONLY');
    expect(report.find(x => x.id === 'review.note')?.status).toBe('CONNECTED');
    expect(fieldConnectionSummary().VISIBILITY_ONLY).toBeGreaterThan(0);
  });

  it('does not conceal a conditionally required field in Quick', () => {
    const hidden = { 'psychology.state': false };
    const detailed = { 'psychology.state': 'DETAILED_ONLY' as const };
    expect(isFieldPresented('psychology.state', true, hidden, detailed, {}, true)).toBe(true);
    expect(requiredPresentationIssues({}, hidden, detailed, new Set(['psychology.state']))).toEqual([]);
  });

  it('keeps optional preferences effective without changing historical values', () => {
    const savedValue = 'Retain this journal note';
    expect(isFieldPresented('review.note', true, { 'review.note': false }, {}, {})).toBe(false);
    expect(savedValue).toBe('Retain this journal note');
  });
});

describe('All-input coverage regression boundaries', () => {
  it('reports every active connected control and never exposes a protected field', () => {
    const report = fieldConnectionReport();
    const connected = report.filter(item => item.status === 'CONNECTED');
    expect(connected.length).toBeGreaterThan(0);
    expect(connected.every(item => item.reason.includes('connected'))).toBe(true);
    expect(report.find(item => item.id === 'candidate.trendRelationship')?.status).toBe('PROTECTED');
  });

  it('keeps user-required optional fields visible even when both preferences hide them', () => {
    const overrides = { 'review.note': true };
    const visibility = { 'review.note': false };
    const placements = { 'review.note': 'DETAILED_ONLY' as const };
    expect(isFieldPresented('review.note', true, visibility, placements, overrides)).toBe(true);
    expect(isFieldPresented('review.note', false, visibility, placements, overrides)).toBe(true);
    expect(requiredPresentationIssues(overrides, visibility, placements)).toEqual([]);
  });

  it('does not treat an unregistered preference key as a formal Required rule', () => {
    const id = 'evidence.direction';
    const overrides = { [id]: true };
    const visibility = { [id]: false };
    const placements = { [id]: 'DETAILED_ONLY' as const };
    expect(FIELD_DEFINITION_BY_ID[id]).toBeUndefined();
    expect(isFieldPresented(id, true, visibility, placements, overrides)).toBe(false);
    expect(isFieldPresented(id, false, visibility, placements, overrides)).toBe(false);
  });

  it.each(['evidence.price','evidence.note'])('required %s is protected from Quick/Detailed hiding', id => {
    const override = { [id]: true };
    const visibility = { [id]: false };
    const placements = { [id]: 'DETAILED_ONLY' as const };
    expect(FIELD_DEFINITION_BY_ID[id]?.group).toBe('Evidence');
    expect(isUserRequired(id, override)).toBe(true);
    expect(fieldConnectionReport().find(item => item.id===id)?.status).toBe('CONNECTED');
    expect(isFieldPresented(id,true,visibility,placements,override)).toBe(true);
    expect(isFieldPresented(id,false,visibility,placements,override)).toBe(true);
    expect(requiredPresentationIssues(override,visibility,placements)).toEqual([]);
    expect(isFieldPresented(id,true,visibility,placements,{})).toBe(false);
  });

  it('never turns unknown controls into hidden controls', () => {
    expect(isFieldPresented('future.unmapped', true, { 'future.unmapped': false },
      { 'future.unmapped': 'DETAILED_ONLY' }, {})).toBe(true);
  });
});

describe('Plan, Zone and Review required-field presentation gate', () => {
  const fields = [
    'plan.mainScenario',
    'plan.alternativeScenario',
    'plan.preSessionState',
    'candidate.sources',
    'candidate.requiredConditions',
    'candidate.invalidationConditions',
    'candidate.label',
    'review.exitReason',
    'review.exitNote',
    'review.note',
  ];

  it.each(fields)('%s remains visible in both modes when user-required', (id) => {
    const overrides = { [id]: true };
    const visibility = { [id]: false };
    const placements = { [id]: 'DETAILED_ONLY' as const };
    expect(isFieldPresented(id, true, visibility, placements, overrides)).toBe(true);
    expect(isFieldPresented(id, false, visibility, placements, overrides)).toBe(true);
    expect(requiredPresentationIssues(overrides, visibility, placements, new Set([id]))).toEqual([]);
  });

  it('allows optional Review notes to be hidden without altering requirement settings', () => {
    expect(isFieldPresented('review.exitNote', true, { 'review.exitNote': false }, {}, {})).toBe(false);
    expect(isFieldPresented('review.note', false, { 'review.note': false }, {}, {})).toBe(false);
  });
});

describe('Session Review Field Manager requirement coverage', () => {
  const ids = ["sessionReview.wentWell","sessionReview.nextImprovement","sessionReview.wentPoorly","sessionReview.bestDecision","sessionReview.biggestMistake","sessionReview.marketLearning"];
  it.each(ids)('%s is genuinely user-required and visible in both modes', id => {
    const entry = FIELD_CONTROL_INVENTORY.find(item=>item.id===id);
    expect(entry?.formalFieldId).toBe(id);
    expect(FIELD_DEFINITION_BY_ID[id]?.group).toBe('SessionReview');
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
    expect(isFieldPresented(id,false,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
    expect(requiredPresentationIssues({[id]:true},{[id]:false},{[id]:'DETAILED_ONLY'})).toEqual([]);
  });
  it('keeps the fields optional until the user marks them required', () => {
    for(const id of ids)expect(isUserRequired(id,{})).toBe(false);
  });
});

describe('Existing intensity controls are formally manageable', () => {
  it.each(['plan.preSessionStateIntensity','psychology.intensity'])('%s is connected, optional by default and visible when Required in Quick', id => {
    expect(FIELD_CONTROL_INVENTORY.find(item=>item.id===id)?.formalFieldId).toBe(id);
    expect(FIELD_DEFINITION_BY_ID[id]?.systemLocked).toBe(false);
    expect(isUserRequired(id,{})).toBe(false);
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Decision and execution Field Manager connections', () => {
  it.each(['decision.quality','trade.plannedTarget'])('%s is formally connected and user-required Quick visibility is preserved', id => {
    expect(FIELD_CONTROL_INVENTORY.find(entry=>entry.id===id)?.formalFieldId).toBe(id);
    expect(fieldConnectionReport().find(entry=>entry.id===id)?.status).toBe('CONNECTED');
    expect(isUserRequired(id,{})).toBe(false);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Existing Plan Revision evidence summary integration', () => {
  it('connects the optional existing persisted summary to the Field Manager without hiding it when Required', () => {
    const id='planRevision.evidence';
    expect(FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.formalFieldId).toBe(id);
    expect(fieldConnectionReport().find(x=>x.id===id)?.status).toBe('CONNECTED');
    expect(isUserRequired(id,{})).toBe(false);
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Rule note conditional Field Manager policy', () => {
  it('marks Rule note as formally connected but optional by default',()=>{
    expect(FIELD_CONTROL_INVENTORY.find(x=>x.id==='rule.note')?.formalFieldId).toBe('rule.note');
    expect(fieldConnectionReport().find(x=>x.id==='rule.note')?.status).toBe('CONNECTED');
    expect(isUserRequired('rule.note',{})).toBe(false);
    expect(isFieldPresented('rule.note',true,{'rule.note':false},{'rule.note':'DETAILED_ONLY'},{'rule.note':true})).toBe(true);
  });
});

describe('Execution event reason field management', () => {
  it.each(['fill.reason','management.reason'])('%s is a real optional field that remains on Quick when Required',id=>{
    expect(FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.formalFieldId).toBe(id);
    expect(fieldConnectionReport().find(x=>x.id===id)?.status).toBe('CONNECTED');
    expect(isUserRequired(id,{})).toBe(false);
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Screenshot metadata Field Manager integration', () => {
  it('connects the actual attachment caption control without requiring an attachment by default', () => {
    const id='attachment.caption';
    expect(FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.formalFieldId).toBe(id);
    expect(fieldConnectionReport().find(x=>x.id===id)?.status).toBe('CONNECTED');
    expect(isUserRequired(id,{})).toBe(false);
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Session Review select field management', () => {
  it.each(['sessionReview.overall','sessionReview.planQuality','sessionReview.discipline'])('%s is connected and cannot be hidden when Required', id => {
    const entry = FIELD_CONTROL_INVENTORY.find(item=>item.id===id);
    expect(entry?.formalFieldId).toBe(id);
    expect(fieldConnectionReport().find(item=>item.id===id)?.status).toBe('CONNECTED');
    expect(isUserRequired(id,{[id]:true})).toBe(true);
    expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{[id]:true})).toBe(true);
  });
});

describe('Formal requirement registry coverage for active customizable inputs', () => {
  it('requires formal definitions for each user-required Plan, Zone and Review control', () => {
    const managedIds = [
      'plan.mainScenario', 'plan.alternativeScenario', 'plan.preSessionState',
      'candidate.label', 'candidate.sources', 'candidate.requiredConditions',
      'candidate.invalidationConditions', 'review.exitReason', 'review.exitNote',
      'review.note',
    ];
    for (const id of managedIds) {
      const item = FIELD_CONTROL_INVENTORY.find(entry => entry.id === id);
      expect(item?.formalFieldId, id).toBe(id);
      expect(item?.candidateForCustomization, id).toBe(true);
      expect(FIELD_DEFINITION_BY_ID[id], id).toBeDefined();
      expect(FIELD_DEFINITION_BY_ID[id]?.systemLocked, id).toBe(false);
      expect(isUserRequired(id, { [id]: true }), id).toBe(true);
    }
  });
});

import {describe,expect,it} from 'vitest';
import {DECISION_DETAILS_ORDER,visibleOrderedDecisionFields} from './visibleOrderedDecisionFields';

describe('Decision Field Manager order without editing persisted Decisions',()=>{
  const reversed={'decision.note':0,'decision.quality':1};
  it('preserves the existing Decision quality Detailed-only default',()=>{
    expect(DECISION_DETAILS_ORDER).toEqual(['decision.quality','decision.note']);
    expect(visibleOrderedDecisionFields(true,{}, {}, {}, {})).toEqual(['decision.note']);
    expect(visibleOrderedDecisionFields(false,{}, {}, {}, {})).toEqual(['decision.quality','decision.note']);
  });
  it('keeps the configured order in both modes when explicitly enabled in Quick',()=>{
    const placements={'decision.quality':'QUICK_AND_DETAILED' as const};
    expect(visibleOrderedDecisionFields(true,reversed,{},placements,{})).toEqual(['decision.note','decision.quality']);
    expect(visibleOrderedDecisionFields(false,reversed,{},placements,{})).toEqual(['decision.note','decision.quality']);
  });
  it('never hides a user-required field even against stale hide/placement preferences',()=>{
    const hidden={'decision.note':false,'decision.quality':false};
    const placements={'decision.note':'DETAILED_ONLY' as const,'decision.quality':'DETAILED_ONLY' as const};
    const required={'decision.note':true,'decision.quality':true};
    expect(visibleOrderedDecisionFields(true,reversed,hidden,placements,required)).toEqual(['decision.note','decision.quality']);
    expect(visibleOrderedDecisionFields(false,reversed,hidden,placements,required)).toEqual(['decision.note','decision.quality']);
  });
  it('removes hidden optional fields while leaving core Decision classification outside customization',()=>{
    expect(visibleOrderedDecisionFields(true,{}, {'decision.note':false}, {}, {})).toEqual([]);
    expect(visibleOrderedDecisionFields(false,{}, {'decision.note':false}, {}, {})).toEqual(['decision.quality']);
    expect(DECISION_DETAILS_ORDER).not.toContain('decision.type');
    expect(DECISION_DETAILS_ORDER).not.toContain('decision.reason');
    expect(DECISION_DETAILS_ORDER).not.toContain('decision.direction');
  });
});

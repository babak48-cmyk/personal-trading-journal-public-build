import {describe,expect,it} from 'vitest';
import {quickValidationRoute} from './quickValidationRoute';

describe('Quick Workflow missing-required navigation',()=>{
  it('routes to the correct existing draft Zone without discarding another Zone',()=>{
    expect(quickValidationRoute('candidate-2.priceFrom',true,false)).toEqual({notebookPage:null,draftStep:2,draftPlanPage:null,draftZonePage:2});
    expect(quickValidationRoute('candidate-0.sources',true,false).draftZonePage).toBe(0);
  });
  it('navigates to market outlook and scenarios pages respectively',()=>{
    expect(quickValidationRoute('plan.preSessionState',true,false)).toMatchObject({draftStep:1,draftPlanPage:0});
    expect(quickValidationRoute('plan.mainScenario',true,false)).toMatchObject({draftStep:1,draftPlanPage:1});
    expect(quickValidationRoute('plan.alternativeScenario',true,false)).toMatchObject({draftStep:1,draftPlanPage:1});
  });
  it.each([
    ['evidence.direction','EVIDENCE'],['evidence.note','EVIDENCE'],
    ['decision.reason','DECISION'],['trade.plannedTarget','EXECUTION'],
    ['fill.reason','EXECUTION'],['management.reason','EXECUTION'],
    ['review.note','EXECUTION'],['rule.note','EXECUTION'],
    ['psychology.stage','EXECUTION'],['sessionReview.wentWell','REVIEW'],
    ['planRevision.evidence','PLAN'],
  ] as const)('routes %s to its actual notebook view %s',(id,page)=>{
    expect(quickValidationRoute(id,false,true).notebookPage).toBe(page);
  });
  it('does not jump into unrelated pages for unknown or nonconfirmed stages',()=>{
    expect(quickValidationRoute('unknown.data',false,true).notebookPage).toBeNull();
    expect(quickValidationRoute('review.note',true,false).notebookPage).toBeNull();
  });
});

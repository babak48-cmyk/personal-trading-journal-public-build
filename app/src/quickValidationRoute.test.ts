import {describe,expect,it} from 'vitest';
import {quickValidationRoute} from './quickValidationRoute';
import {CAPTURABLE_CUSTOM_FIELD_STAGES,customFieldFocusId} from './customFieldStage';

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
    ['planRevision.evidence','PLAN'],['liveZone.reason','PLAN'],['liveCandidate.label','PLAN'],['liveCandidate.sources','PLAN'],['liveCandidate.requiredConditions','PLAN'],['zoneRevision.reason','PLAN'],
  ] as const)('routes %s to its actual notebook view %s',(id,page)=>{
    expect(quickValidationRoute(id,false,true).notebookPage).toBe(page);
  });
  it('does not jump into unrelated pages for unknown or nonconfirmed stages',()=>{
    expect(quickValidationRoute('unknown.data',false,true).notebookPage).toBeNull();
    expect(quickValidationRoute('review.note',true,false).notebookPage).toBeNull();
  });
  it.each(CAPTURABLE_CUSTOM_FIELD_STAGES)('%s routes encoded owner/field focus without parsing ambiguous identifiers',(stage)=>{
    const id=customFieldFocusId(stage,'a-b','c-d');
    const route=quickValidationRoute(id,false,true);
    expect(route.notebookPage).toBe(stage==='trade'||stage==='post-trade-review'?'EXECUTION':stage==='session-review'?'REVIEW':'PLAN');
  });
  it('routes missing persisted custom field values by canonical owner stage',()=>{
    expect(quickValidationRoute('custom-required-premarket-plan-session1-fieldA',true,false))
      .toMatchObject({draftStep:1,draftPlanPage:0});
    expect(quickValidationRoute('custom-required-candidate-zone1-fieldA',false,true).notebookPage).toBe('PLAN');
    expect(quickValidationRoute('custom-required-zone-zone1-fieldB',false,true).notebookPage).toBe('PLAN');
    expect(quickValidationRoute('custom-required-trade-trade1-fieldC',false,true).notebookPage).toBe('EXECUTION');
    expect(quickValidationRoute('custom-required-post-trade-review-trade1-fieldD',false,true).notebookPage).toBe('EXECUTION');
  });
  it.each([
    'candidate','zone','trade','post-trade-review','session-review'
  ] as const)('does not force %s Custom Field into a confirmed page before Plan confirmation',(stage)=>{
    const fieldId=customFieldFocusId(stage,'owner-123','field-456');
    const route=quickValidationRoute(fieldId,true,false);
    expect(route.notebookPage).toBeNull();
  });
  it('does not take draft Session custom fields away from the required Plan form',()=>{
    const id=customFieldFocusId('session','session-abc','required-ready');
    expect(quickValidationRoute(id,true,false)).toMatchObject({
      notebookPage:null,draftStep:1,draftPlanPage:0
    });
    const premarketId=customFieldFocusId('premarket-plan','session-abc','required-scenario');
    expect(quickValidationRoute(premarketId,true,false)).toMatchObject({
      notebookPage:null,draftStep:1,draftPlanPage:0
    });
  });
  it('only routes Custom Field after Plan confirmation when its actual owner stage is available',()=>{
    const before=customFieldFocusId('post-trade-review','t-1','mood');
    expect(quickValidationRoute(before,false,false).notebookPage).toBeNull();
    expect(quickValidationRoute(before,false,true).notebookPage).toBe('EXECUTION');
    const review=customFieldFocusId('session-review','session-1','summary');
    expect(quickValidationRoute(review,false,true).notebookPage).toBe('REVIEW');
  });
  it('never navigates into a nonexistent confirmed stage for draft custom fields',()=>{
    expect(quickValidationRoute('custom-required-trade-t1-f1',true,false).notebookPage).toBeNull();
  });

});

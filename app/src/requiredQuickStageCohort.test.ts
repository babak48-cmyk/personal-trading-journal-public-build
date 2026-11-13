import {describe,expect,it} from 'vitest';
import {quickValidationRoute} from './quickValidationRoute';
import {reviewCompletionIssues,type ReviewCompletionInput} from './reviewCompletion';
import {zoneRequiredIssues} from './zoneRequired';
import {evidenceRequiredIssues} from './evidenceValidation';
import {isFieldPresented} from './fieldInventory';
import type {CandidateDraftInput} from './services/localApi';

const review:ReviewCompletionInput={
  decisionQuality:'A',executionQuality:'GOOD',managementQuality:'GOOD',
  exitReason:'TARGET',exitNote:'',reviewNote:'',ruleNote:'',
  ruleViolationReported:null,emotionAffected:true,
  psychologyState:'',psychologyStage:'',psychologyIntensity:null,
};
const priceMissingZone={
  label:'Test Zone',sources:[],required_conditions:[],invalidation_conditions:[],
  price_mode:'RANGE',price_from:null,price_to:null,
} as unknown as CandidateDraftInput;

describe('Cross-stage Quick required/conditional navigation contract',()=>{
  it('routes the same missing observation to Evidence and requires an explicit direction',()=>{
    const issues=evidenceRequiredIssues({'evidence.direction':true,'evidence.note':true},6000,'','');
    expect(issues.map(x=>x.id)).toEqual(['evidence.direction','evidence.note']);
    expect(issues.map(x=>quickValidationRoute(x.id,false,true).notebookPage)).toEqual(['EVIDENCE','EVIDENCE']);
    expect(isFieldPresented('evidence.direction',true,{'evidence.direction':false},{'evidence.direction':'DETAILED_ONLY'}, {'evidence.direction':true})).toBe(true);
  });
  it('routes conditional psychology requirements to Execution only when emotion affected the trade',()=>{
    const yes=reviewCompletionIssues(true,{},review);
    expect(yes.map(x=>x.id)).toEqual(['psychology.state','psychology.stage']);
    expect(yes.every(x=>quickValidationRoute(x.id,false,true).notebookPage==='EXECUTION')).toBe(true);
    expect(reviewCompletionIssues(true,{}, {...review,emotionAffected:false})).toEqual([]);
    expect(reviewCompletionIssues(false,{}, review)).toEqual([]);
  });
  it('keeps a configured intensity Required only on applicable emotion=yes Review completion',()=>{
    const overrides={'psychology.intensity':true};
    const missing=reviewCompletionIssues(true,overrides,review);
    expect(missing.some(x=>x.id==='psychology.intensity')).toBe(true);
    expect(reviewCompletionIssues(true,overrides,{...review,emotionAffected:false})).toEqual([]);
    expect(isFieldPresented('psychology.intensity',true,{'psychology.intensity':false},{'psychology.intensity':'DETAILED_ONLY'},overrides)).toBe(true);
  });
  it('routes each missing conditional range bound to its precise draft Zone',()=>{
    const missing=zoneRequiredIssues(priceMissingZone,'candidate-2',{},' (zone 3)');
    expect(missing.map(x=>x.id)).toEqual(['candidate-2.priceFrom','candidate-2.priceTo']);
    for(const issue of missing)
      expect(quickValidationRoute(issue.id,true,false)).toMatchObject({draftStep:2,draftZonePage:2});
  });
  it('routes required Decision notes to Decision and required Session Review to Review',()=>{
    expect(quickValidationRoute('decision.note',false,true).notebookPage).toBe('DECISION');
    expect(quickValidationRoute('sessionReview.nextImprovement',false,true).notebookPage).toBe('REVIEW');
    expect(isFieldPresented('decision.note',true,{'decision.note':false},{'decision.note':'DETAILED_ONLY'}, {'decision.note':true})).toBe(true);
  });
});

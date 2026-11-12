import { describe, expect, it } from 'vitest';
import {hasUnsavedEntryInputs,hasUnsavedManagementInputs,hasUnsavedReviewChanges,type ReviewDraftValues} from './quickUnsavedCapture';
import type {TradeReview,TradeRuleCheck} from './services/localApi';

const emptyEntry={entryPrice:null,stopPrice:null,quantity:1,target:null,commission:'',fees:''};
const emptyManagement={fillPrice:null,fillQuantity:1,fillReason:'',fillCommission:'',fillFees:'',newStop:null,stopReason:''};
const emptyReview:ReviewDraftValues={
  decisionQuality:'',executionQuality:'',managementQuality:'',exitReason:'',exitNote:'',
  emotionAffected:null,psychologyState:'',psychologyIntensity:null,psychologyStage:'',
  mistakes:[],note:'',ruleViolationReported:null,violatedRuleIds:[],ruleNote:'',
};
describe('Quick capture navigation — no silent loss',()=>{
  it('does not warn on untouched defaults but detects quantity-only entry and known zero prices',()=>{
    expect(hasUnsavedEntryInputs(emptyEntry)).toBe(false);
    expect(hasUnsavedEntryInputs({...emptyEntry,quantity:2})).toBe(true);
    expect(hasUnsavedEntryInputs({...emptyEntry,entryPrice:0})).toBe(true);
    expect(hasUnsavedEntryInputs({...emptyEntry,stopPrice:6000})).toBe(true);
    expect(hasUnsavedEntryInputs({...emptyEntry,target:6020})).toBe(true);
    expect(hasUnsavedEntryInputs({...emptyEntry,fees:'0'})).toBe(true);
    expect(hasUnsavedEntryInputs({...emptyEntry,fees:'   '})).toBe(false);
  });
  it('detects unsaved fill, partial-exit sizing, cost and stop changes without inventing a fill',()=>{
    expect(hasUnsavedManagementInputs(emptyManagement)).toBe(false);
    expect(hasUnsavedManagementInputs({...emptyManagement,fillQuantity:3})).toBe(true);
    expect(hasUnsavedManagementInputs({...emptyManagement,fillPrice:0})).toBe(true);
    expect(hasUnsavedManagementInputs({...emptyManagement,fillCommission:'0'})).toBe(true);
    expect(hasUnsavedManagementInputs({...emptyManagement,newStop:100})).toBe(true);
    expect(hasUnsavedManagementInputs({...emptyManagement,stopReason:'trail'})).toBe(true);
  });
  it('does not warn on an untouched new Review, even when no mistakes were reported',()=>{
    expect(hasUnsavedReviewChanges(emptyReview,null,null)).toBe(false);
  });
  it('detects draft text, quality, psychology and Rule Check modifications',()=>{
    expect(hasUnsavedReviewChanges({...emptyReview,decisionQuality:'A'},null,null)).toBe(true);
    expect(hasUnsavedReviewChanges({...emptyReview,note:'lesson'},null,null)).toBe(true);
    expect(hasUnsavedReviewChanges({...emptyReview,mistakes:['late-exit']},null,null)).toBe(true);
    expect(hasUnsavedReviewChanges({...emptyReview,emotionAffected:false},null,null)).toBe(true);
    expect(hasUnsavedReviewChanges({...emptyReview,emotionAffected:true,psychologyState:'FEAR'},null,null)).toBe(true);
    expect(hasUnsavedReviewChanges({...emptyReview,ruleViolationReported:false},null,null)).toBe(true);
  });
  it('compares against saved Review and Rule history, not an empty default or array ordering',()=>{
    const saved:TradeReview={
      review_id:'r-1',trade_id:'t-1',status:'DRAFT',
      decision_quality:'A',execution_quality:'GOOD',management_quality:'ACCEPTABLE',
      exit_reason_code:'STOP',exit_reason_note:'Stopped',emotion_affected:true,
      psychology_state:'FEAR',psychology_intensity:2,psychology_stage:'ENTRY',
      mistake_type_ids:['b','a'],note:'saved lesson',
    };
    const rules:TradeRuleCheck={
      trade_rule_check_id:'c-1',trade_id:'t-1',checked_at:'2026-11-12T01:00:00Z',
      any_violation:true,violated_rule_version_ids:['rule-2','rule-1'],note:'saved breach',
    };
    const draft:ReviewDraftValues={
      decisionQuality:'A',executionQuality:'GOOD',managementQuality:'ACCEPTABLE',
      exitReason:'STOP',exitNote:'Stopped',emotionAffected:true,psychologyState:'FEAR',
      psychologyIntensity:2,psychologyStage:'ENTRY',mistakes:['a','b'],note:'saved lesson',
      ruleViolationReported:true,violatedRuleIds:['rule-1','rule-2'],ruleNote:'saved breach',
    };
    expect(hasUnsavedReviewChanges(draft,saved,rules)).toBe(false);
    expect(hasUnsavedReviewChanges({...draft,ruleNote:'new breach'},saved,rules)).toBe(true);
    expect(hasUnsavedReviewChanges({...draft,psychologyIntensity:3},saved,rules)).toBe(true);
    expect(hasUnsavedReviewChanges({...draft,exitNote:'new note'},saved,rules)).toBe(true);
    expect(hasUnsavedReviewChanges({...draft,mistakes:['a']},saved,rules)).toBe(true);
    expect(hasUnsavedReviewChanges({...draft,ruleViolationReported:false,violatedRuleIds:[],ruleNote:''},saved,rules)).toBe(true);
  });
  it('ignores inactive conditional details but never drops the explicit yes/no flag',()=>{
    const stale:ReviewDraftValues={...emptyReview,emotionAffected:false,psychologyState:'old unused value'};
    expect(hasUnsavedReviewChanges(stale,{review_id:'r-1',trade_id:'t-1',status:'DRAFT',emotion_affected:false,mistake_type_ids:[]},null)).toBe(false);
    expect(hasUnsavedReviewChanges({...stale,emotionAffected:true},null,null)).toBe(true);
  });
});

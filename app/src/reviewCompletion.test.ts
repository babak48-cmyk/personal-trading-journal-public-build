import { describe, expect, it } from 'vitest';
import { reviewCompletionIssues, type ReviewCompletionInput } from './reviewCompletion';
const blank:ReviewCompletionInput={
  decisionQuality:'',executionQuality:'',managementQuality:'',exitReason:'',exitNote:'',reviewNote:'',ruleNote:'',ruleViolationReported:null,violatedRuleIds:[],emotionAffected:true,
  psychologyState:'',psychologyStage:'',psychologyIntensity:null,
};

describe('Review Pending and finalization boundaries',()=>{
  it('allows an incomplete draft, even with emotion affecting the trade',()=>{
    expect(reviewCompletionIssues(false,{'review.decisionQuality':true},blank)).toEqual([]);
  });
  it('requires state and affected stage only on finalization with emotion yes',()=>{
    expect(reviewCompletionIssues(true,{},blank).map(x=>x.id))
      .toEqual(['psychology.state','psychology.stage']);
    expect(reviewCompletionIssues(true,{}, {...blank,psychologyState:'FOMO',psychologyStage:'ENTRY'})).toEqual([]);
  });
  it('does not require psychology details when emotion is no',()=>{
    expect(reviewCompletionIssues(true,{}, {...blank,emotionAffected:false})).toEqual([]);
  });
  it('enforces enabled user-required Review fields at completion, not draft',()=>{
    const overrides={'review.decisionQuality':true,'review.managementQuality':true};
    const values={...blank,emotionAffected:false,decisionQuality:'A'};
    expect(reviewCompletionIssues(true,overrides,values).map(x=>x.id))
      .toEqual(['review.managementQuality']);
  });
  it.each([
    ['review.exitReason','exitReason','STOP'],
    ['review.exitNote','exitNote','Stopped at initial risk'],
    ['review.note','reviewNote','One useful lesson'],
  ] as const)('requires %s only when enabled and review is completed', (id,key,answer)=>{
    const opts={...blank,emotionAffected:false};
    expect(reviewCompletionIssues(false,{[id]:true},opts)).toEqual([]);
    expect(reviewCompletionIssues(true,{[id]:true},opts).map(x=>x.id)).toEqual([id]);
    expect(reviewCompletionIssues(true,{[id]:true},{...opts,[key]:answer})).toEqual([]);
    expect(reviewCompletionIssues(true,{[id]:true},{...opts,[key]:'   '})).toHaveLength(1);
  });
  it('enforces intensity only if configured Required and emotion affected the trade',()=>{
    const opts={...blank,psychologyState:'FEAR',psychologyStage:'ENTRY'};
    expect(reviewCompletionIssues(true,{'psychology.intensity':true},opts).map(x=>x.id)).toEqual(['psychology.intensity']);
    expect(reviewCompletionIssues(false,{'psychology.intensity':true},opts)).toEqual([]);
    expect(reviewCompletionIssues(true,{'psychology.intensity':true},{...opts,psychologyIntensity:3})).toEqual([]);
    expect(reviewCompletionIssues(true,{'psychology.intensity':true},{...opts,emotionAffected:false})).toEqual([]);
  });
  it('Rule note is Required only on finalization when a rule violation is reported',()=>{
    const overrides={'rule.note':true};
    const values={...blank,emotionAffected:false,ruleViolationReported:true,violatedRuleIds:['rule-version-1']};
    expect(reviewCompletionIssues(false,overrides,values)).toEqual([]);
    expect(reviewCompletionIssues(true,overrides,values).map(x=>x.id)).toEqual(['rule.note']);
    expect(reviewCompletionIssues(true,overrides,{...values,ruleNote:'  '})).toHaveLength(1);
    expect(reviewCompletionIssues(true,overrides,{...values,ruleNote:'Moved stop outside plan'})).toEqual([]);
    expect(reviewCompletionIssues(true,overrides,{...values,ruleViolationReported:false})).toEqual([]);
    expect(reviewCompletionIssues(true,overrides,{...values,ruleViolationReported:null})).toEqual([]);
  });
  it('requires a specific violated rule when YES, but never on Review Pending or NO',()=>{
    const yes={...blank,emotionAffected:false,ruleViolationReported:true,violatedRuleIds:[]};
    expect(reviewCompletionIssues(false,{},yes)).toEqual([]);
    expect(reviewCompletionIssues(true,{},yes).map(x=>x.id)).toEqual(['rule.violatedIds']);
    expect(reviewCompletionIssues(true,{}, {...yes,violatedRuleIds:['   ']}).map(x=>x.id)).toEqual(['rule.violatedIds']);
    expect(reviewCompletionIssues(true,{}, {...yes,violatedRuleIds:['rule-version-1']})).toEqual([]);
    expect(reviewCompletionIssues(true,{}, {...yes,ruleViolationReported:false})).toEqual([]);
    expect(reviewCompletionIssues(true,{}, {...yes,ruleViolationReported:null})).toEqual([]);
  });
  it('reports both rule selection and user-required note without inventing a rule',()=>{
    const yes={...blank,emotionAffected:false,ruleViolationReported:true,violatedRuleIds:[]};
    expect(reviewCompletionIssues(true,{'rule.note':true},yes).map(x=>x.id)).toEqual(['rule.violatedIds','rule.note']);
  });
  it('never forces a mistake to be invented when none occurred',()=>{
    const values={...blank,emotionAffected:false};
    expect(reviewCompletionIssues(true,{'review.mistakes':true},values)).toEqual([]);
  });
  it('does not invent a requirement when emotion flag is optional',()=>{
    expect(reviewCompletionIssues(true,{}, {...blank,emotionAffected:null})).toEqual([]);
  });
});

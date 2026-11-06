import { describe, expect, it } from 'vitest';
import { reviewCompletionIssues, type ReviewCompletionInput } from './reviewCompletion';
const blank:ReviewCompletionInput={
  decisionQuality:'',executionQuality:'',managementQuality:'',emotionAffected:true,
  psychologyState:'',psychologyStage:'',
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
  it('does not invent a requirement when emotion flag is optional',()=>{
    expect(reviewCompletionIssues(true,{}, {...blank,emotionAffected:null})).toEqual([]);
  });
});

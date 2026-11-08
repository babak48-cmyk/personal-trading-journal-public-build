import {describe,expect,it} from 'vitest';
import {FIELD_DEFINITIONS,isUserRequired} from './fieldDefinitions';
import {
  ACTIVE_VISIBILITY_FIELD_IDS,FIELD_CONTROL_INVENTORY,activeVisibilityInventoryIssues,
  fieldConnectionReport,fieldConnectionSummary,isFieldPresented,requiredPresentationIssues,
  type FieldPlacement,
} from './fieldInventory';
import {
  CAPTURABLE_CUSTOM_FIELD_STAGES,canCaptureCustomFieldStage,customFieldFocusId,
} from './customFieldStage';
import {evidenceRequiredIssues} from './evidenceValidation';
import {attachmentCaptionIssue} from './attachmentCaptionValidation';
import {reviewCompletionIssues,type ReviewCompletionInput} from './reviewCompletion';
import {quickValidationRoute} from './quickValidationRoute';

/** One consolidated cross-stage policy contract for the existing Package A flow.
 * These are frontend policy regressions, NOT a Rust/SQLite integration or Windows acceptance test. */
describe('Package A cross-stage delivery gate',()=>{
  it('accounts for every inventory control without silently treating protected semantics as unfinished',()=>{
    const entries=FIELD_CONTROL_INVENTORY;
    const report=fieldConnectionReport();
    const counts=fieldConnectionSummary();
    expect(report).toHaveLength(entries.length);
    expect(new Set(entries.map(x=>x.id)).size).toBe(entries.length);
    expect(counts.CONNECTED+counts.PROTECTED+counts.VISIBILITY_ONLY+counts.PENDING).toBe(entries.length);
    expect(activeVisibilityInventoryIssues()).toEqual([]);
    // These are intentionally system-locked, not three newly missing implementation tasks.
    for(const id of ['candidate.trendRelationship','psychology.state','psychology.stage']){
      expect(report.find(x=>x.id===id)?.status).toBe('PROTECTED');
    }
    // Mistakes are exception-based; absence of a mistake is a valid review.
    expect(report.find(x=>x.id==='review.mistakes')?.status).toBe('VISIBILITY_ONLY');
    expect(report.some(x=>x.status==='PENDING')).toBe(false);
  });

  it('keeps EVERY eligible user-required control visible in Quick and Detailed, even under hide and detailed-only preferences',()=>{
    const connected=fieldConnectionReport().filter(x=>x.status==='CONNECTED');
    const manageable=connected.filter(x=>{
      const def=FIELD_DEFINITIONS.find(d=>d.id===x.id);
      return def?.defaultRequirement==='OPTIONAL' && !def.systemLocked;
    });
    const overrides=Object.fromEntries(manageable.map(x=>[x.id,true]));
    const hidden=Object.fromEntries(ACTIVE_VISIBILITY_FIELD_IDS.map(id=>[id,false]));
    const detailed=Object.fromEntries(ACTIVE_VISIBILITY_FIELD_IDS.map(id=>[id,'DETAILED_ONLY' as FieldPlacement]));
    for(const field of manageable){
      expect(isUserRequired(field.id,overrides)).toBe(true);
      expect(isFieldPresented(field.id,true,hidden,detailed,overrides)).toBe(true);
      expect(isFieldPresented(field.id,false,hidden,detailed,overrides)).toBe(true);
    }
    expect(requiredPresentationIssues(overrides,hidden,detailed,new Set(['psychology.state','psychology.stage']))).toEqual([]);
  });

  it('separates user-selected Evidence direction from the historical optional Neutral fallback',()=>{
    expect(evidenceRequiredIssues({},null,'','')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'','').map(x=>x.id)).toEqual(['evidence.direction']);
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'','NEUTRAL')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.price':true},0,'','')).toEqual([]);
    expect(attachmentCaptionIssue({},'')).toBeNull();
    expect(attachmentCaptionIssue({'attachment.caption':true},'')).toMatchObject({id:'attachment.caption'});
  });

  it('keeps Review Pending drafts permissive and requires configured answers only on explicit completion',()=>{
    const review:ReviewCompletionInput={
      decisionQuality:'',executionQuality:'',managementQuality:'',exitReason:'',exitNote:'',
      reviewNote:'',ruleNote:'',ruleViolationReported:false,emotionAffected:false,
      psychologyState:'',psychologyStage:'',psychologyIntensity:null,
    };
    const overrides={'review.note':true,'rule.note':true};
    expect(reviewCompletionIssues(false,overrides,review)).toEqual([]);
    expect(reviewCompletionIssues(true,overrides,review).map(x=>x.id)).toEqual(['review.note']);
    expect(reviewCompletionIssues(true,overrides,{...review,ruleViolationReported:true}).map(x=>x.id))
      .toEqual(['review.note','rule.note']);
    expect(reviewCompletionIssues(true,overrides,{...review,reviewNote:'Actionable lesson',ruleNote:'Rule breach',ruleViolationReported:true}))
      .toEqual([]);
  });

  it('supports only custom capture stages with an actual owner editor, and preserves trade-specific focus identity',()=>{
    expect(CAPTURABLE_CUSTOM_FIELD_STAGES).toEqual(['session','premarket-plan','zone','post-trade-review']);
    for(const stage of ['evidence','decision','execution','trade','candidate','session-review']){
      expect(canCaptureCustomFieldStage(stage)).toBe(false);
    }
    expect(customFieldFocusId('post-trade-review','trade-1','context'))
      .not.toBe(customFieldFocusId('post-trade-review','trade-2','context'));
  });

  it('takes missing Required answers to the actual existing stage, never an unrelated review or trade execution',()=>{
    expect(quickValidationRoute('candidate-3.priceFrom',true,false)).toMatchObject({draftStep:2,draftZonePage:3});
    expect(quickValidationRoute('plan.mainScenario',true,false)).toMatchObject({draftStep:1,draftPlanPage:1});
    expect(quickValidationRoute('evidence.direction',false,true).notebookPage).toBe('EVIDENCE');
    expect(quickValidationRoute('decision.note',false,true).notebookPage).toBe('DECISION');
    expect(quickValidationRoute('trade.entryPrice',false,true).notebookPage).toBe('EXECUTION');
    // Post-trade Review currently lives on the Execution page; Session Review is separate.
    expect(quickValidationRoute('review.note',false,true).notebookPage).toBe('EXECUTION');
    expect(quickValidationRoute('sessionReview.nextImprovement',false,true).notebookPage).toBe('REVIEW');
  });
});

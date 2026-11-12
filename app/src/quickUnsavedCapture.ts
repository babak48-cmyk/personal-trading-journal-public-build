import type { TradeReview, TradeRuleCheck } from './services/localApi';

/** Unsent operator inputs are not evidence or persisted fills. A non-default
 * quantity alone is meaningful and must not be silently dropped. */
export function hasUnsavedEntryInputs(input:Readonly<{
  entryPrice:number|null;stopPrice:number|null;quantity:number;target:number|null;
  commission:string;fees:string;
}>):boolean{
  return input.entryPrice!==null||input.stopPrice!==null||input.quantity!==1
    ||input.target!==null||!!input.commission.trim()||!!input.fees.trim();
}

export function hasUnsavedManagementInputs(input:Readonly<{
  fillPrice:number|null;fillQuantity:number;fillReason:string;
  fillCommission:string;fillFees:string;
  newStop:number|null;stopReason:string;
}>):boolean{
  return input.fillPrice!==null||input.fillQuantity!==1||!!input.fillReason.trim()
    ||!!input.fillCommission.trim()||!!input.fillFees.trim()
    ||input.newStop!==null||!!input.stopReason.trim();
}

export type ReviewDraftValues=Readonly<{
  decisionQuality:string;executionQuality:string;managementQuality:string;
  exitReason:string;exitNote:string;emotionAffected:boolean|null;
  psychologyState:string;psychologyIntensity:number|null;psychologyStage:string;
  mistakes:readonly string[];note:string;
  ruleViolationReported:boolean|null;violatedRuleIds:readonly string[];ruleNote:string;
}>;

const text=(v:string|null|undefined)=>v??'';
const equalIds=(a:readonly string[],b:readonly string[])=>a.length===b.length
  && [...a].sort().every((id,index)=>id===[...b].sort()[index]);

/** Compare the visible Review draft to the LAST VERIFIED persisted Review
 * and Rule Check, never to a different Trade. No default false/zero is assumed. */
export function hasUnsavedReviewChanges(values:ReviewDraftValues,review:TradeReview|null,rules:TradeRuleCheck|null):boolean{
  if(values.decisionQuality!==text(review?.decision_quality)
    ||values.executionQuality!==text(review?.execution_quality)
    ||values.managementQuality!==text(review?.management_quality)
    ||values.exitReason!==text(review?.exit_reason_code)
    ||values.exitNote!==text(review?.exit_reason_note)
    ||values.emotionAffected!==(review?.emotion_affected??null)
    ||values.note!==text(review?.note)
    ||!equalIds(values.mistakes,review?.mistake_type_ids??[]))return true;
  if(values.emotionAffected===true&&(
    values.psychologyState!==text(review?.psychology_state)
    ||values.psychologyIntensity!==(review?.psychology_intensity??null)
    ||values.psychologyStage!==text(review?.psychology_stage)))return true;
  if(values.ruleViolationReported!==(rules?.any_violation??null))return true;
  if(values.ruleViolationReported===true&&(
    !equalIds(values.violatedRuleIds,rules?.violated_rule_version_ids??[])
    ||values.ruleNote!==text(rules?.note)))return true;
  return false;
}

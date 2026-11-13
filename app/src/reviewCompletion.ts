import { FIELD_DEFINITION_BY_ID, isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type ReviewCompletionInput = Readonly<{
  decisionQuality:string;
  executionQuality:string;
  managementQuality:string;
  exitReason:string;
  exitNote:string;
  reviewNote:string;
  ruleNote:string;
  ruleViolationReported:boolean|null;
  violatedRuleIds:readonly string[];
  emotionAffected:boolean|null;
  psychologyState:string;
  psychologyStage:string;
  psychologyIntensity:number|null;
}>;
export type ReviewCompletionIssue = Readonly<{id:string;label:string}>;

/** Only finalization requires full Review answers. Review Pending drafts may be partial. */
export function reviewCompletionIssues(
  finalize:boolean,
  overrides:RequirementOverrides,
  values:ReviewCompletionInput,
):ReviewCompletionIssue[] {
  if(!finalize)return [];
  const fields:[string,boolean][] = [
    ['review.decisionQuality',!!values.decisionQuality],
    ['review.executionQuality',!!values.executionQuality],
    ['review.managementQuality',!!values.managementQuality],
    ['review.exitReason',!!values.exitReason.trim()],
    ['review.exitNote',!!values.exitNote.trim()],
    ['review.note',!!values.reviewNote.trim()],
    ['psychology.emotionAffected',values.emotionAffected!==null],
  ];
  const issues=fields.filter(([id,present])=>isUserRequired(id,overrides)&&!present)
    .map(([id])=>({id,label:FIELD_DEFINITION_BY_ID[id]?.label??id}));
  // Recorded YES must identify which currently configured rule(s) were broken.
  // An empty selection is not equivalent to NO; deferred Review drafts remain partial.
  if(values.ruleViolationReported===true && !values.violatedRuleIds.some(id=>id.trim()))
    issues.push({id:'rule.violatedIds',label:'Violated rules'});
  // Exception-based: never require a rule note when no violation was reported.
  if(values.ruleViolationReported===true && isUserRequired('rule.note',overrides) && !values.ruleNote.trim())
    issues.push({id:'rule.note',label:FIELD_DEFINITION_BY_ID['rule.note']?.label??'Rule violation note'});
  if(values.emotionAffected===true){
    if(!values.psychologyState.trim())issues.push({id:'psychology.state',label:'Psychology state'});
    if(!values.psychologyStage.trim())issues.push({id:'psychology.stage',label:'Affected stage'});
    if(isUserRequired('psychology.intensity',overrides) && values.psychologyIntensity==null)
      issues.push({id:'psychology.intensity',label:FIELD_DEFINITION_BY_ID['psychology.intensity']?.label??'Emotion intensity'});
  }
  return issues;
}

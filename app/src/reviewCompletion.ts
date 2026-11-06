import { FIELD_DEFINITION_BY_ID, isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type ReviewCompletionInput = Readonly<{
  decisionQuality:string;
  executionQuality:string;
  managementQuality:string;
  emotionAffected:boolean|null;
  psychologyState:string;
  psychologyStage:string;
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
    ['psychology.emotionAffected',values.emotionAffected!==null],
  ];
  const issues=fields.filter(([id,present])=>isUserRequired(id,overrides)&&!present)
    .map(([id])=>({id,label:FIELD_DEFINITION_BY_ID[id]?.label??id}));
  if(values.emotionAffected===true){
    if(!values.psychologyState.trim())issues.push({id:'psychology.state',label:'Psychology state'});
    if(!values.psychologyStage.trim())issues.push({id:'psychology.stage',label:'Affected stage'});
  }
  return issues;
}

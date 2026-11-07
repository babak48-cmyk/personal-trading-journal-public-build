import { isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type PlanRevisionEvidenceIssue = Readonly<{id:string;label:string}>;

/** The same evidence-summary column is used for a plan change and a new live Zone.
 * An unanswered summary is permissible unless the trader explicitly marked it Required.
 */
export function planRevisionEvidenceIssues(
  overrides:RequirementOverrides,
  summary:string,
):PlanRevisionEvidenceIssue[] {
  if(!isUserRequired('planRevision.evidence',overrides)||summary.trim())return [];
  return [{id:'planRevision.evidence',label:'New evidence summary for plan revision'}];
}

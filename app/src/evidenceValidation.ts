import { isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type EvidenceRequiredIssue = Readonly<{ id:string; label:string }>;

/** A zero numeric price is present; only null signifies a missing numeric price. */
export function evidenceRequiredIssues(
  overrides:RequirementOverrides,
  price:number|null,
  note:string,
):EvidenceRequiredIssue[] {
  const issues:EvidenceRequiredIssue[]=[];
  if(isUserRequired('evidence.price',overrides)&&price===null)issues.push({id:'evidence.price',label:'Observed price'});
  if(isUserRequired('evidence.note',overrides)&&!note.trim())issues.push({id:'evidence.note',label:'Evidence note'});
  return issues;
}

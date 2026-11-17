import { isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type EvidenceRequiredIssue = Readonly<{ id:string; label:string }>;

/** A zero numeric price is present; only null signifies a missing numeric price. */
export function evidenceRequiredIssues(
  overrides:RequirementOverrides,
  price:number|null,
  note:string,
  explicitlySelectedDirection:string='',
):EvidenceRequiredIssue[] {
  const issues:EvidenceRequiredIssue[]=[];
  // A saved NEUTRAL fallback is not evidence that the trader deliberately selected a direction.
  if(isUserRequired('evidence.direction',overrides)&&!['NEUTRAL','BUY','SELL'].includes(explicitlySelectedDirection))
    issues.push({id:'evidence.direction',label:'Observed direction'});
  // Never serialize a non-finite observation as if it were a real price.
// Optional means it may be blank; an explicitly provided invalid price is not valid.
  if((isUserRequired('evidence.price',overrides)&&price===null)
    ||(price!==null&&!Number.isFinite(price)))
    issues.push({id:'evidence.price',label:'Valid observed price'});
  if(isUserRequired('evidence.note',overrides)&&!note.trim())issues.push({id:'evidence.note',label:'Evidence note'});
  return issues;
}

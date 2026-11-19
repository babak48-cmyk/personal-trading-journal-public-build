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
    issues.push({id:'evidence.price',label:'Observed price'});
  if(isUserRequired('evidence.note',overrides)&&!note.trim())issues.push({id:'evidence.note',label:'Evidence note'});
  return issues;
}

/** Prewrite owner-stage selection guard. An empty, duplicated or stale evidence
 * type must not create an ambiguous observation or enter a partial atomic batch.
 * The available IDs are the actual loaded evidence registry, not Plan sources. */
export function evidenceSelectionIssues(
  selectedIds:readonly string[],
  availableIds:readonly string[],
):EvidenceRequiredIssue[] {
  if(selectedIds.length===0)return [{id:'evidence.selection',label:'Observed evidence type'}];
  const known=new Set(availableIds);
  const seen=new Set<string>();
  for(const id of selectedIds){
    if(!id.trim()||!known.has(id)||seen.has(id))
      return [{id:'evidence.selection',label:'Select valid, distinct observed evidence types'}];
    seen.add(id);
  }
  return [];
}

/** Keep an advanced classification legible after switching Detailed → Quick.
 * Ordinary Quick capture stays compact; a previously chosen ENTRY_CONFIRMATION
 * or INVALIDATION is not silently replaced or visually disguised as Unclassified.
 * This is presentation only; evidence role and persisted events are unchanged.
 */
export function showAdvancedEvidenceRole(
  quickMode:boolean,
  selectedRole:string,
  advancedRole:'ENTRY_CONFIRMATION'|'INVALIDATION',
):boolean {
  return !quickMode || selectedRole===advancedRole;
}

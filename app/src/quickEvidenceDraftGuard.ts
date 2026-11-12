/** Pure unsaved-observation check for Quick Evidence.
 * No selection is pre-confirmed; a missing note or role is not invented.
 * A batch already acknowledged as saved is immutable, not an unsaved draft. */
export type QuickEvidenceDraft=Readonly<{
  selectedIds:readonly string[];
  stances:Readonly<Record<string,string>>;
  direction:string;
  price:number|null;
  note:string;
  acknowledgedSaved:boolean;
}>;

export function hasUnsavedEvidenceDraft(draft:QuickEvidenceDraft):boolean{
  if(draft.acknowledgedSaved)return false;
  if(draft.selectedIds.length>0)return true;
  if(draft.price!==null||draft.direction!==''||draft.note.trim()!=='')return true;
  return Object.values(draft.stances).some(role=>role!=='GENERAL_OBSERVATION');
}

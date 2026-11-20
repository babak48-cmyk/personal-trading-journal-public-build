/** Unsubmitted Custom Fields remain owner-scoped UI drafts, not saved events.
 * Changing Session must not drop them without a visible, explicit decision.
 * Keep the test independent of react/Tauri persistence or user files.
 */
export function customEditorKey(kind:'typed'|'select',stage:string,ownerId:string):string {
  return kind+':'+stage.length+':'+stage+':'+ownerId.length+':'+ownerId;
}

export function hasUnsubmittedCustomTypedDraft(
  values:Readonly<Record<string,string>>,
  saved:Readonly<Record<string,string>>,
  eligibleFieldIds:readonly string[],
):boolean {
  return eligibleFieldIds.some(id=>(values[id]??'')!==(saved[id]??''));
}

/** Selection order is meaningful for immutable MULTI_SELECT snapshots. */
export function hasUnsubmittedCustomSelectionDraft(
  selected:Readonly<Record<string,readonly string[]>>,
  saved:Readonly<Record<string,readonly string[]>>,
  eligibleFieldIds:readonly string[],
):boolean {
  return eligibleFieldIds.some(id=>{
    const current=selected[id]??[],initial=saved[id]??[];
    return current.length!==initial.length||current.some((choice,index)=>choice!==initial[index]);
  });
}

export function hasUnsavedCustomEditors(dirtyKeys:ReadonlySet<string>):boolean {
  return dirtyKeys.size>0;
}

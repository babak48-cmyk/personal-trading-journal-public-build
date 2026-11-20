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

/** Keep just the edited Zone card mounted when Quick switches to another.
 * Both candidate and zone custom definitions attach to the same canonical
 * candidate ID but are separate stages and separate typed/select editors. */
export function hasUnsavedCustomZoneInputs(
  dirtyKeys:ReadonlySet<string>,
  zoneId:string,
):boolean {
  return (['candidate','zone'] as const).some(stage=>
    (['typed','select'] as const).some(kind=>
      dirtyKeys.has(customEditorKey(kind,stage,zoneId))));
}

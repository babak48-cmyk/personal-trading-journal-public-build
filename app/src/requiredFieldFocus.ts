/** Expand every enclosing native disclosure before focusing a missing required input.
 * A single closest('details') misses outer closed groups in nested Quick forms.
 * No field values, navigation state or persistent data are modified.
 */
export type DisclosureNode = {
  readonly parentElement:DisclosureNode|null;
  readonly tagName:string;
  open?:boolean;
};
export function openRequiredFieldDisclosures(node:DisclosureNode):number {
  let count=0;
  let parent=node.parentElement;
  while(parent){
    if(parent.tagName.toUpperCase()==='DETAILS' && !parent.open){
      parent.open=true;count++;
    }
    parent=parent.parentElement;
  }
  return count;
}


/** A retry may run only for its newest request and exact destination.
 * Navigation never changes validation or persisted values. */
export type RequiredFocusContext = Readonly<{
 sessionId:string|null; generation:number; page:string; draftStep:number;
 draftPlanPage:number; draftZonePage:number; zoneId:string; quickMode:boolean;
 evidenceId:string|null; decisionId:string|null;
}>;
export function isCurrentRequiredFocus(
 request:number,currentRequest:number,expected:RequiredFocusContext,current:RequiredFocusContext,
):boolean {
 return request===currentRequest && expected.sessionId===current.sessionId
  && expected.generation===current.generation && expected.page===current.page
  && expected.draftStep===current.draftStep && expected.draftPlanPage===current.draftPlanPage
  && expected.draftZonePage===current.draftZonePage && expected.zoneId===current.zoneId
  && expected.quickMode===current.quickMode && expected.evidenceId===current.evidenceId
  && expected.decisionId===current.decisionId;
}

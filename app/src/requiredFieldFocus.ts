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

export type AvailableCustomOption=Readonly<{option_id:string;active:boolean}>;
/** Draft selection policy shared by Save and its enabled/disabled UI state.
 * Previously corrupted Single Select events could contain two or more IDs;
 * never append that malformed state as a new verified event.
 */
export function validCustomSelectionDraft(
  kind:string,ids:readonly string[],options:readonly AvailableCustomOption[],
):boolean{
  if(kind!=='SINGLE_SELECT'&&kind!=='MULTI_SELECT')return false;
  if(ids.length===0||ids.length>100)return false;
  if(kind==='SINGLE_SELECT'&&ids.length!==1)return false;
  if(new Set(ids).size!==ids.length)return false;
  return ids.every(id=>options.some(o=>o.option_id===id&&o.active));
}

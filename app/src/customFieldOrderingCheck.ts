/** Verify the exact requested adjacent move against newly read persisted order.
 * The field/option IDs must remain identical; no other item may move.
 */
export function verifiedAdjacentMove(
  before:readonly string[],after:readonly string[],id:string,direction:-1|1
):boolean{
  if(before.length!==after.length||new Set(before).size!==before.length||new Set(after).size!==after.length)return false;
  const position=before.indexOf(id),target=position+direction;
  if(position<0||target<0||target>=before.length)return false;
  const expected=[...before];
  [expected[position],expected[target]]=[expected[target],expected[position]];
  return expected.every((v,i)=>after[i]===v);
}

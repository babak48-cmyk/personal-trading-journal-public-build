/** The sole recovery control must remain available while administrative writes
 * are locked after an uncertain result. Only an in-flight request blocks Refresh.
 */
export function customAdminRefreshDisabled(busy:boolean):boolean{
  return busy;
}
export function customAdminEditDisabled(busy:boolean,uncertain:boolean):boolean{
  return busy||uncertain;
}

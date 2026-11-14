/** Prevent indistinguishable active custom-field names/options in the same
 * capture stage. Stable IDs and historical labels remain unchanged.
 */
export function normalizedCustomLabel(label:string):string{
  return label.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase();
}
export function isUniqueActiveCustomLabel(
  label:string,
  existing:readonly {label:string;active:boolean;id:string}[],
  exceptId?:string,
):boolean{
  const requested=normalizedCustomLabel(label);
  return requested.length>0 && !existing.some(x=>x.active&&x.id!==exceptId&&normalizedCustomLabel(x.label)===requested);
}

/** Compare a saved Field Manager preference map to a fresh persisted read-back.
 * Ignore object key insertion order and (only for requirement overrides) explicit
 * false values, which have the same semantics as absent optional overrides.
 * Never claim a successful save solely because an IPC write returned.
 */
export type PreferenceValue = boolean | number | string | null | {label?:string;help?:string};
export type PreferenceMap = Readonly<Record<string,PreferenceValue>>;
type PreferenceKind = 'REQUIREMENTS' | 'VISIBILITY' | 'PLACEMENT' | 'ORDER' | 'TEXT';

function normalized(map:PreferenceMap,kind:PreferenceKind):string{
  return JSON.stringify(Object.entries(map)
    .filter(([,value])=>kind!=='REQUIREMENTS'||value===true)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([key,value])=>[key,kind==='TEXT' && value && typeof value==='object' ?
      {label:typeof value.label==='string'?value.label:'',help:typeof value.help==='string'?value.help:''}:value]));
}
export function matchesPersistedPreferences(kind:PreferenceKind,expected:PreferenceMap,persisted:PreferenceMap):boolean{
  return normalized(expected,kind)===normalized(persisted,kind);
}

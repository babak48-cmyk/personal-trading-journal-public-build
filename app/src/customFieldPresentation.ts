import type { CustomFieldDefinition } from './services/localApi';
export type CustomFieldPlacement = 'QUICK_AND_DETAILED'|'DETAILED_ONLY';
export type CustomFieldPresentation = Readonly<{visible:boolean;placement:CustomFieldPlacement}>;
export type CustomFieldPresentationMap = Readonly<Record<string,CustomFieldPresentation>>;

export const defaultCustomPresentation:CustomFieldPresentation = {visible:true,placement:'QUICK_AND_DETAILED'};
export function effectiveCustomPresentation(field:CustomFieldDefinition,prefs:CustomFieldPresentationMap):CustomFieldPresentation {
  // Required and system-protected semantics override an older optional choice.
  if(field.required)return defaultCustomPresentation;
  return prefs[field.field_id]??defaultCustomPresentation;
}
export function isCustomFieldPresented(field:CustomFieldDefinition,quickMode:boolean,prefs:CustomFieldPresentationMap):boolean {
  if(!field.active)return false;
  const setting=effectiveCustomPresentation(field,prefs);
  return setting.visible&&(!quickMode||setting.placement==='QUICK_AND_DETAILED');
}
export function nextCustomPresentation(field:CustomFieldDefinition,prefs:CustomFieldPresentationMap,
  property:'visible'|'placement'):CustomFieldPresentationMap{
  if(!field.active||field.required)return prefs;
  const previous=effectiveCustomPresentation(field,prefs);
  return {...prefs,[field.field_id]:property==='visible'
    ?{...previous,visible:!previous.visible}
    :{...previous,placement:previous.placement==='QUICK_AND_DETAILED'?'DETAILED_ONLY':'QUICK_AND_DETAILED'}};
}

/** Remove preferences only for definitions already absent from the active database.
 * Must receive the complete definition list (including deactivated fields).
 * Never drops a deactivated/hidden field's preferences or touches its history.
 */
export function compactCustomPresentation(prefs:CustomFieldPresentationMap,
  allDefinitions:readonly CustomFieldDefinition[]):CustomFieldPresentationMap{
  const ids=new Set(allDefinitions.map(f=>f.field_id));
  return Object.fromEntries(Object.entries(prefs).filter(([id])=>ids.has(id)));
}

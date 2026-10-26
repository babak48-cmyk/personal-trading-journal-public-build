/** Gate 3 typed option policy. Pure, non-persistent safety layer: migration and UI are separate gates. */
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT';
export type CustomOption = Readonly<{id:string;label:string;active:boolean;order:number}>;
export type SelectSnapshot = Readonly<{optionId:string;labelAtSelection:string}>;
export type CustomFieldDefinition = Readonly<{
  id:string; type:CustomFieldType; stage:string; label:string; required:boolean;
  active:boolean; options:readonly CustomOption[];
}>;
const validId=(s:string)=>/^[a-z][a-z0-9_-]{2,63}$/.test(s);
export function validateCustomFieldDefinition(f:CustomFieldDefinition):string[]{
  const errors:string[]=[];
  if(!validId(f.id))errors.push('invalid field id');
  if(!f.stage.trim()||f.stage.length>64)errors.push('invalid stage');
  if(!f.label.trim()||f.label.length>100)errors.push('invalid field label');
  if(f.options.length>100)errors.push('too many options');
  if(!['SINGLE_SELECT','MULTI_SELECT'].includes(f.type)&&f.options.length)errors.push('non-select field has options');
  const ids=new Set<string>();
  for(const o of f.options){
    if(!validId(o.id)||ids.has(o.id))errors.push('invalid or duplicate option id');
    ids.add(o.id);
    if(!o.label.trim()||o.label.length>100)errors.push('invalid option label');
    if(!Number.isSafeInteger(o.order)||o.order<0)errors.push('invalid option order');
  }
  return errors;
}
/** New selections can only target active options; deactivation never deletes prior snapshots. */
export function captureSelectSnapshot(
  definition:CustomFieldDefinition, selectedIds:readonly string[],
):SelectSnapshot[]{
  if(!['SINGLE_SELECT','MULTI_SELECT'].includes(definition.type))throw new Error('not a select field');
  if(!definition.active || validateCustomFieldDefinition(definition).length)throw new Error('invalid or inactive field');
  if(definition.type==='SINGLE_SELECT'&&selectedIds.length>1)throw new Error('multiple choices for single-select');
  if(new Set(selectedIds).size!==selectedIds.length)throw new Error('duplicate selection');
  return selectedIds.map(id=>{
    const option=definition.options.find(o=>o.id===id&&o.active);
    if(!option)throw new Error('unknown or inactive option');
    return {optionId:option.id,labelAtSelection:option.label};
  });
}
/** Historical meaning is the captured label, not the current edited taxonomy. */
export function historicSelectionLabels(snapshots:readonly SelectSnapshot[]):string[]{
  return snapshots.map(x=>x.labelAtSelection);
}

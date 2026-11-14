import type { CustomFieldDefinition, CustomSelection, CustomTypedValue } from './services/localApi';
import { eligibleCustomFields, type CustomFieldOwnerStage } from './customFieldStage';

export type CustomRequiredIssue = Readonly<{id:string;label:string;fieldId:string}>;
export type CustomValueReader = Readonly<{
  listCustomFieldDefinitions:()=>Promise<CustomFieldDefinition[]>;
  currentCustomFieldTypedValue:(stage:string,ownerId:string,fieldId:string)=>Promise<CustomTypedValue|null>;
  currentCustomFieldSelection:(stage:string,ownerId:string,fieldId:string)=>Promise<CustomSelection|null>;
}>;

/** Shared semantic validity policy for both Quick/Detailed missing-field markers
 * and the save-boundary guard. Do not count non-empty mismatched legacy values
 * as satisfying a currently required field. Zero and false are valid values.
 */
export function isUsableCustomTypedValue(fieldType:string,value:CustomTypedValue|null):boolean{
  if(!value?.event_id)return false;
  return fieldType==='TEXT'? value.value_type==='TEXT'&&!!value.text_value?.trim()
    :fieldType==='NUMBER'? value.value_type==='NUMBER'&&value.number_value!==null&&value.number_value!==undefined&&Number.isFinite(value.number_value)
    :fieldType==='DATE'? value.value_type==='DATE'&&!!value.date_value?.trim()
    :fieldType==='BOOLEAN'? value.value_type==='BOOLEAN'&&value.boolean_value!==null&&value.boolean_value!==undefined : false;
}

export function isUsableCustomSelection(value:CustomSelection|null):boolean{
  return !!value?.event_id&&!!value.options.length
    && value.options.every(o=>!!o.option_id?.trim()&&!!o.label_at_selection?.trim())
    && new Set(value.options.map(o=>o.option_id)).size===value.options.length;
}

/** Check persisted values, not unfinished drafts. A saved false/zero is a valid answer. */
export async function missingRequiredCustomValues(
  reader:CustomValueReader,
  stage:CustomFieldOwnerStage,
  ownerId:string,
):Promise<CustomRequiredIssue[]>{
  const defs=(await reader.listCustomFieldDefinitions()).filter(f=>f.required);
  const typed=eligibleCustomFields(defs,stage,'typed');
  const selections=eligibleCustomFields(defs,stage,'select');
  const [typedValues,selectedValues]=await Promise.all([
    Promise.all(typed.map(async field=>({field,value:await reader.currentCustomFieldTypedValue(stage,ownerId,field.field_id)}))),
    Promise.all(selections.map(async field=>({field,value:await reader.currentCustomFieldSelection(stage,ownerId,field.field_id)}))),
  ]);
  const missing:CustomRequiredIssue[]=[];
  for(const {field,value} of typedValues){
    const valid=isUsableCustomTypedValue(field.field_type,value);
    if(!valid)missing.push({id:field.field_id,label:field.label,fieldId:field.field_id});
  }
  for(const {field,value} of selectedValues){
    if(!isUsableCustomSelection(value))missing.push({id:field.field_id,label:field.label,fieldId:field.field_id});
  }
  return missing;
}

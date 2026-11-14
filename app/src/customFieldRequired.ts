import type { CustomFieldDefinition, CustomSelection, CustomTypedValue } from './services/localApi';
import { eligibleCustomFields, type CustomFieldOwnerStage } from './customFieldStage';

export type CustomRequiredIssue = Readonly<{id:string;label:string;fieldId:string}>;
export type CustomValueReader = Readonly<{
  listCustomFieldDefinitions:()=>Promise<CustomFieldDefinition[]>;
  currentCustomFieldTypedValue:(stage:string,ownerId:string,fieldId:string)=>Promise<CustomTypedValue|null>;
  currentCustomFieldSelection:(stage:string,ownerId:string,fieldId:string)=>Promise<CustomSelection|null>;
}>;

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
    // A typed field must be backed by a current persisted value OF ITS OWN TYPE.
    // A stale/mismatched historical event must never satisfy a new required input.
    const valid=field.field_type==='TEXT'? value?.value_type==='TEXT'&&!!value.text_value?.trim()
      :field.field_type==='NUMBER'? value?.value_type==='NUMBER'&&value.number_value!==null&&value.number_value!==undefined&&Number.isFinite(value.number_value)
      :field.field_type==='DATE'? value?.value_type==='DATE'&&!!value.date_value?.trim()
      :field.field_type==='BOOLEAN'? value?.value_type==='BOOLEAN'&&value.boolean_value!==null&&value.boolean_value!==undefined : false;
    if(!valid)missing.push({id:field.field_id,label:field.label,fieldId:field.field_id});
  }
  for(const {field,value} of selectedValues){
    const hasUsableSnapshot=!!value?.event_id&&!!value.options.length
      && value.options.every(o=>!!o.option_id?.trim()&&!!o.label_at_selection?.trim())
      && new Set(value.options.map(o=>o.option_id)).size===value.options.length;
    if(!hasUsableSnapshot)missing.push({id:field.field_id,label:field.label,fieldId:field.field_id});
  }
  return missing;
}

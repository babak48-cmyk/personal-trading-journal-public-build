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
/** Same Gregorian YYYY-MM-DD boundary as native custom_fields::valid_calendar_date.
 * Read-only validation: legacy or incomplete values remain in event history,
 * but cannot silently satisfy a newly required DATE field.
 */
export function isValidCustomCalendarDate(value:string):boolean{
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
  const year=Number(value.slice(0,4));
  const month=Number(value.slice(5,7));
  const day=Number(value.slice(8,10));
  if(year===0||month<1||month>12)return false;
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const maxDay=month===2?(leap?29:28):[4,6,9,11].includes(month)?30:31;
  return day>=1&&day<=maxDay;
}

export function isUsableCustomTypedValue(fieldType:string,value:CustomTypedValue|null):boolean{
  if(!value?.event_id)return false;
  return fieldType==='TEXT'? value.value_type==='TEXT'&&!!value.text_value?.trim()
    :fieldType==='NUMBER'? value.value_type==='NUMBER'&&value.number_value!==null&&value.number_value!==undefined&&Number.isFinite(value.number_value)
    :fieldType==='DATE'? value.value_type==='DATE'&&typeof value.date_value==='string'&&isValidCustomCalendarDate(value.date_value)
    :fieldType==='BOOLEAN'? value.value_type==='BOOLEAN'&&value.boolean_value!==null&&value.boolean_value!==undefined : false;
}

export function isUsableCustomSelection(value:CustomSelection|null,fieldType:'SINGLE_SELECT'|'MULTI_SELECT'='MULTI_SELECT'):boolean{
  return !!value?.event_id&&!!value.options.length
    && value.options.length<=100
    && (fieldType!=='SINGLE_SELECT'||value.options.length===1)
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
    if(!isUsableCustomSelection(value,field.field_type as 'SINGLE_SELECT'|'MULTI_SELECT'))missing.push({id:field.field_id,label:field.label,fieldId:field.field_id});
  }
  return missing;
}

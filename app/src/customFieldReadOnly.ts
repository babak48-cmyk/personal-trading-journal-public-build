import type {CustomFieldDefinition,CustomSelection,CustomTypedValue} from './services/localApi';
import { CAPTURABLE_CUSTOM_FIELD_STAGES } from './customFieldStage';

export type ReadOnlyCustomRow=Readonly<{
  id:string;
  label:string;
  display:string;
  retired:boolean;
  stage:string;
  displayOrder:number;
}>;

/** Use stored option LABEL snapshots, not mutable current option names.
 * Keep inactive field definitions visible when they contain historical values. */
export function readOnlyCustomRow(
  field:CustomFieldDefinition,
  typed:CustomTypedValue|null,
  selection:CustomSelection|null,
):ReadOnlyCustomRow|null {
  let display:string|null=null;
  switch(field.field_type){
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      if(selection?.event_id&&selection.options.length)display=[...selection.options]
        .sort((a,b)=>a.ordinal-b.ordinal)
        .map(option=>option.label_at_selection).join(', ');
      break;
    case 'TEXT':
      if(typed?.event_id&&typed.value_type==='TEXT'&&typed.text_value!=null&&typed.text_value.trim())display=typed.text_value;
      break;
    case 'NUMBER':
      if(typed?.event_id&&typed.value_type==='NUMBER'&&typed.number_value!=null&&Number.isFinite(typed.number_value))
        display=String(typed.number_value);
      break;
    case 'BOOLEAN':
      if(typed?.event_id&&typed.value_type==='BOOLEAN'&&typed.boolean_value!=null)display=typed.boolean_value?'Yes':'No';
      break;
    case 'DATE':
      if(typed?.event_id&&typed.value_type==='DATE'&&typed.date_value)display=typed.date_value;
      break;
  }
  return display==null?null:{
    id:field.field_id,label:field.label,display,
    retired:!field.active,stage:field.stage,displayOrder:field.display_order,
  };
}

/** Historical answers are grouped by actual capture lifecycle, never by
 * accidental alphabetical stage names (candidate would otherwise precede session).
 */
export function orderedReadOnlyCustomRows(rows:readonly ReadOnlyCustomRow[]):ReadOnlyCustomRow[]{
  const rank=(stage:string)=>{
    const i=(CAPTURABLE_CUSTOM_FIELD_STAGES as readonly string[]).indexOf(stage);
    return i<0?Number.MAX_SAFE_INTEGER:i;
  };
  return [...rows].sort((a,b)=>rank(a.stage)-rank(b.stage)
    ||a.stage.localeCompare(b.stage)||a.displayOrder-b.displayOrder||a.id.localeCompare(b.id));
}

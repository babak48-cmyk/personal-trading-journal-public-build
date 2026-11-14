import type { CustomTypedInput, CustomTypedValue, CustomSelectionInput, CustomSelection } from './services/localApi';

/** A successful IPC return alone does not establish that this exact new event
 * and its immutable value/option snapshot became current for the intended owner.
 * Compare original event IDs as well as values to prevent false success messages.
 */
export function verifiedCustomTypedEvent(request:CustomTypedInput, actual:CustomTypedValue|null):boolean{
  if(!actual||actual.event_id!==request.event_id)return false;
  const given=[
    request.text_value!==null,
    request.number_value!==null,
    request.date_value!==null,
    request.boolean_value!==null,
  ];
  if(given.filter(Boolean).length!==1)return false;
  if(request.text_value!==null)return actual.value_type==='TEXT'&&actual.text_value===request.text_value;
  if(request.number_value!==null)return actual.value_type==='NUMBER'&&Number.isFinite(request.number_value)&&actual.number_value===request.number_value;
  if(request.date_value!==null)return actual.value_type==='DATE'&&actual.date_value===request.date_value;
  return actual.value_type==='BOOLEAN'&&actual.boolean_value===request.boolean_value;
}

export function verifiedCustomSelectionEvent(request:CustomSelectionInput,actual:CustomSelection|null):boolean{
  if(!actual||actual.event_id!==request.event_id)return false;
  const expected=request.option_ids;
  if(expected.length===0||new Set(expected).size!==expected.length||actual.options.length!==expected.length)return false;
  const actualIds=actual.options.map(o=>o.option_id);
  if(new Set(actualIds).size!==actualIds.length||!expected.every(id=>actualIds.includes(id)))return false;
  // A historical option-label snapshot must be present for later review.
  return actual.options.every(o=>typeof o.label_at_selection==='string'&&o.label_at_selection.trim().length>0);
}

/** A deterministic pre-write validation error is not an uncertain storage result.
 * Only this explicit type can bypass the Admin uncertain-write lock. Never infer
 * write safety from text in a backend/database error message.
 */
export class CustomAdminValidationError extends Error{
  constructor(message:string){super(message);this.name='CustomAdminValidationError';}
}
export function isPreWriteCustomAdminValidation(error:unknown):error is CustomAdminValidationError{
  return error instanceof CustomAdminValidationError;
}

/** Mirror the native create_custom_field pre-transaction shape guards.
 * This only rejects definitely invalid local inputs; it never classifies a
 * rejected IPC/database write as safe, nor requires choices on creation.
 */
export function validateNewCustomFieldDefinition(input:{
 field_id:string;stage:string;field_type:string;label:string;help_text:string;display_order:number
}):void{
 const byteLength=(v:string)=>new TextEncoder().encode(v).length;
 const hasControl=(v:string)=>/[\u0000-\u001f\u007f-\u009f]/u.test(v);
 const stages=['session','premarket-plan','candidate','zone','trade','post-trade-review','execution','session-review'];
 const types=['TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT'];
 if(!input.field_id||byteLength(input.field_id)>128||hasControl(input.field_id))
   throw new CustomAdminValidationError('Invalid custom field identity.');
 if(!stages.includes(input.stage))throw new CustomAdminValidationError('Unsupported custom field stage.');
 if(!types.includes(input.field_type))throw new CustomAdminValidationError('Unsupported custom field type.');
 if(!input.label.trim()||byteLength(input.label)>240||hasControl(input.label))
   throw new CustomAdminValidationError('Field label must be nonempty, up to 240 UTF-8 bytes, without control characters.');
 if(byteLength(input.help_text)>240||hasControl(input.help_text))
   throw new CustomAdminValidationError('Help text must be at most 240 UTF-8 bytes, without control characters.');
 if(!Number.isInteger(input.display_order)||input.display_order<0)
   throw new CustomAdminValidationError('Invalid custom field display order.');
}


/** Capture the actual saved text at editor opening, not a later render.
 * Refreshing the list must not silently turn a stale draft into a valid edit. */
export type CustomFieldTextSnapshot = Readonly<{field_id:string;label:string;help_text:string}>;
export function assertCustomFieldTextUnchanged(
 baseline:CustomFieldTextSnapshot|undefined,
 latest:CustomFieldTextSnapshot|undefined,
):void{
 if(!baseline||!latest||baseline.field_id!==latest.field_id||
    baseline.label!==latest.label||baseline.help_text!==latest.help_text)
  throw new CustomAdminValidationError('Field text changed or no longer exists. Cancel the edit, refresh, and reopen it.');
}
export function customFieldTextReadbackMatches(
 expected:CustomFieldTextSnapshot & {stage:string;field_type:string;required:boolean;active:boolean;display_order:number},
 actual:typeof expected|undefined,
):boolean{
 return !!actual&&actual.field_id===expected.field_id&&actual.label===expected.label&&
 actual.help_text===expected.help_text&&actual.stage===expected.stage&&
 actual.field_type===expected.field_type&&actual.required===expected.required&&
 actual.active===expected.active&&actual.display_order===expected.display_order;
}

/** Append after all saved siblings, including inactive records and sparse ranks. */
export function nextCustomDisplayOrder(siblings:readonly {display_order:number}[]):number {
 const next=siblings.reduce((max,row)=>Math.max(max,row.display_order),-1)+1;
 if(!Number.isSafeInteger(next))
   throw new CustomAdminValidationError('Saved display order cannot be extended. Reorder the existing fields or options first.');
 return next;
}

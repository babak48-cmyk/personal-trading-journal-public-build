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

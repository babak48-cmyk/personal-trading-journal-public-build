/** Select definitions may be saved without options; enabling Required may not.
 * Use saved, current options (not stale UI state) and reject before sending a
 * mutating IPC when zero active choices remain. Historical snapshots are untouched.
 */
import {CustomAdminValidationError} from './customAdminValidation';

export type SelectRequirementOption = Readonly<{active:boolean}>;
export function assertSelectCanBecomeRequired(
  kind:string,
  wantsRequired:boolean,
  savedOptions:readonly SelectRequirementOption[]
):void {
  if(!wantsRequired||!['SINGLE_SELECT','MULTI_SELECT'].includes(kind))return;
  if(!savedOptions.some(option=>option.active))
    throw new CustomAdminValidationError('Add at least one active option before marking this select field Required. No change was sent.');
}
export function optionBearingFieldIds(
  fields:readonly Readonly<{field_id:string;field_type:string}>[]
):string[] {
  return fields.filter(field=>['SINGLE_SELECT','MULTI_SELECT'].includes(field.field_type)).map(field=>field.field_id);
}


/** Mirrors the native safeguard: a Required select must retain an active choice.
 * savedOptions must be freshly read from SQLite before the change is sent.
 */
export function assertCanDeactivateSelectOption(
  required:boolean,
  optionId:string,
  savedOptions:readonly Readonly<{option_id:string;active:boolean}>[]
):void {
  if(required&&!savedOptions.some(option=>option.active&&option.option_id!==optionId))
    throw new CustomAdminValidationError('A Required select field must keep at least one active option. Add or activate another option first; no change was sent.');
}

/** Native stores a trimmed name; compare read-back against the same canonical
 * persisted spelling rather than the original input with boundary whitespace.
 */
export function isSavedCustomFieldLabel(expectedInput:string,savedLabel:string):boolean {
  return savedLabel===expectedInput.trim();
}


/** Mirror create_option's shape checks before the mutating IPC. This is
 * deliberately limited to deterministic input validation, never an assumption
 * that a failed native/database write did or did not persist.
 */
export function validateNewCustomOptionInput(
  optionId:string,
  fieldId:string,
  label:string,
  order:number
):void {
  const keyValid=(s:string)=>s.length>0&&new TextEncoder().encode(s).length<=128&&!/[\u0000-\u001f\u007f-\u009f]/u.test(s);
  if(!keyValid(optionId)||!keyValid(fieldId))
    throw new CustomAdminValidationError('Invalid custom option identity.');
  if(!label.trim()||new TextEncoder().encode(label).length>240||/[\u0000-\u001f\u007f-\u009f]/u.test(label))
    throw new CustomAdminValidationError('Option label must be nonempty and at most 240 UTF-8 bytes, without control characters.');
  if(!Number.isSafeInteger(order)||order<0)
    throw new CustomAdminValidationError('Invalid custom option display order.');
}

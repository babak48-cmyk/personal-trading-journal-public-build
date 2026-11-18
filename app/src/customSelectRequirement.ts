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

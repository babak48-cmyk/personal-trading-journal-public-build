import { isValidCustomCalendarDate } from './customFieldRequired';
import { isValidNativeCustomTextValue } from './customTextValidity';

/** Mirrors the native CustomField TEXT append boundary.
 * A rejected draft must not be sent as an event and then misclassified as an
 * uncertain database write. Never trim the user's valid original text.
 */
export function isValidCustomTextDraft(value:string):boolean{
  return isValidNativeCustomTextValue(value);
}

/** Reject bad input locally before attempting any native event append.
 * Align with native record_typed_value: all four supported kinds must carry
 * exactly one valid type-specific value. Preserve valid TEXT unchanged.
 */
export function isValidCustomTypedDraft(kind:string,raw:string):boolean{
  switch(kind){
    case 'TEXT':return isValidCustomTextDraft(raw);
    case 'NUMBER':return raw.trim().length>0&&Number.isFinite(Number(raw));
    case 'DATE':return isValidCustomCalendarDate(raw);
    case 'BOOLEAN':return raw==='true'||raw==='false';
    default:return false;
  }
}

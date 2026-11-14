import { isValidCustomCalendarDate } from './customFieldRequired';

/** Mirrors the native CustomField TEXT append boundary.
 * A rejected draft must not be sent as an event and then misclassified as an
 * uncertain database write. Never trim the user's valid original text.
 */
export function isValidCustomTextDraft(value:string):boolean{
  return value.trim().length>0
    && new TextEncoder().encode(value).length<=4000
    && !Array.from(value).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127);
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

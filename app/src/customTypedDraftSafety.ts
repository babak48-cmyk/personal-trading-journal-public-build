/** Mirrors the native CustomField TEXT append boundary.
 * A rejected draft must not be sent as an event and then misclassified as an
 * uncertain database write. Never trim the user's valid original text.
 */
export function isValidCustomTextDraft(value:string):boolean{
  return value.trim().length>0
    && new TextEncoder().encode(value).length<=4000
    && !Array.from(value).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127);
}

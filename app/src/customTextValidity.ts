/** Shared validation for native CustomField TEXT append and persisted Required.
 * Mirrors Rust: UTF-8 byte cap 4000, trim-nonempty, reject Unicode General
 * Category Cc controls (U+0000..001F and U+007F..009F).
 * Does NOT alter or sanitize historical values.
 */
export function isValidNativeCustomTextValue(value:string):boolean{
  return value.trim().length>0
    && new TextEncoder().encode(value).length<=4000
    && !/[\u0000-\u001F\u007F-\u009F]/u.test(value);
}

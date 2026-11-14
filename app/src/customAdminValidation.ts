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

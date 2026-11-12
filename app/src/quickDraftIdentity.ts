/** In-memory, never persisted: segregate unfinished editor drafts by their
 * original session and immutable owner identity. Characters in IDs cannot
 * cause ambiguous compound keys. */
export function scopedQuickDraftKey(
  sessionId:string, ownerKind:'DECISION'|'ENTRY', ownerId:string, decisionType?:string,
):string{
  return [sessionId,ownerKind,ownerId,decisionType??''].map(encodeURIComponent).join('::');
}

/** In-memory, never persisted: segregate unfinished editor drafts by their
 * original session and immutable owner identity. Characters in IDs cannot
 * cause ambiguous compound keys. */
export function scopedQuickDraftKey(
  sessionId:string, ownerKind:'DECISION'|'ENTRY'|'REENTRY', ownerId:string, decisionType?:string, priorTradeId?:string|null,
):string{
  const parts=[sessionId,ownerKind,ownerId,decisionType??''];
  if(ownerKind==='REENTRY')parts.push(priorTradeId??'');
  return parts.map(encodeURIComponent).join('::');
}

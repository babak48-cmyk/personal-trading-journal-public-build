/** A mutable correction workspace is unavailable until the trade's full
 * immutable audit history has been loaded successfully. A failed/pending read
 * is UNKNOWN, never an empty/verified ledger. Backend validation is additional.
 */
export function auditedFillCorrectionEditable(
  tradeStatus:string,
  lockedReview:boolean,
  auditHistoryVerified:boolean,
):boolean {
  return tradeStatus==='CLOSED'&&!lockedReview&&auditHistoryVerified;
}

/** Review status must be scoped to the exact persisted Trade, not just the
 * current editor owner. A stale response carrying another trade_id cannot
 * lock this Review as COMPLETED. Legacy callers lacking trade_id preserve
 * editor-owner checking, but persisted TradeReview always supplies its id.
 */
export function isCompletedReviewForTrade(
  review: { status: string; trade_id?: string } | null,
  reviewOwnerTradeId: string | null,
  selectedTradeId: string,
): boolean {
  return reviewOwnerTradeId === selectedTradeId
    && review?.status === 'COMPLETED'
    && (review.trade_id===undefined || review.trade_id===selectedTradeId);
}

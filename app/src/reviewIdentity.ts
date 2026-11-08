/** Review status must be scoped to the exact persisted trade, never reused across selections. */
export function isCompletedReviewForTrade(
  review: { status: string } | null,
  reviewOwnerTradeId: string | null,
  selectedTradeId: string,
): boolean {
  return reviewOwnerTradeId === selectedTradeId && review?.status === 'COMPLETED';
}

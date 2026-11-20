import type {TradeMetrics, TradeReview} from './services/localApi';

/** Derive a session's deferred work from persisted trade-level review state.
 * An absent review is pending; a completed review is never shown as pending.
 * Failures to read review state must be handled by the caller as UNKNOWN, not empty. */
export function pendingReviewTrades(
  sessionId:string,
  rows:readonly Readonly<{trade:TradeMetrics;review:TradeReview|null}>[],
):TradeMetrics[]{
  return rows
    .filter(({trade,review})=>trade.session_id===sessionId && trade.status==='CLOSED'
      // A COMPLETED review for another Trade cannot close this Trade's work.
      && !(review?.status==='COMPLETED'&&review.trade_id===trade.trade_id))
    .map(({trade})=>trade);
}

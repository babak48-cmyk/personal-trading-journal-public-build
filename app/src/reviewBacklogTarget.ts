import type { TradeMetrics } from './services/localApi';

/** Only the exact persisted, closed trade belonging to the loaded session
 * can be opened from cross-session Review Pending. Never infer a trade by
 * matching symbol, date, direction, or list position. */
export function findClosedReviewTarget(
  sessionId:string, tradeId:string, trades:readonly TradeMetrics[],
):TradeMetrics|undefined {
  return trades.find(t=>t.session_id===sessionId && t.trade_id===tradeId && t.status==='CLOSED');
}

/** Analytics can open OPEN or CLOSED trades, unlike Review Pending. Match
 * persisted trade ID AND original session ID; never resolve by row index. */
export function findJournalTradeTarget(
  sessionId:string, tradeId:string, trades:readonly TradeMetrics[],
):TradeMetrics|undefined {
  return trades.find(t=>t.session_id===sessionId && t.trade_id===tradeId);
}

import type { TradeMetrics } from './services/localApi';

export type SessionTradeExecutionSummary = Readonly<{
  totalTrades:number;
  activeTrades:number;
  closedTrades:number;
  partialExitTrades:number;
  knownRTrades:number;
  unknownRClosedTrades:number;
  sumKnownR:number;
}>;

/** Pure read-only summary. Only CLOSED trades with known finite R contribute;
 * never treat missing commission/risk or pending open positions as zero P&L.
 * Counts are recorded trades, not independent statistically validated setups.
 */
export function summarizeSessionTradeExecution(trades:readonly TradeMetrics[]):SessionTradeExecutionSummary{
  const closed=trades.filter(t=>t.status==='CLOSED');
  const validR=closed.filter(t=>typeof t.realized_r==='number'&&Number.isFinite(t.realized_r));
  return {
    totalTrades:trades.length,
    activeTrades:trades.filter(t=>t.status==='OPEN'||t.status==='PARTIALLY_CLOSED').length,
    closedTrades:closed.length,
    partialExitTrades:trades.filter(t=>t.total_exit_quantity>0&&t.open_quantity>0).length,
    knownRTrades:validR.length,
    unknownRClosedTrades:closed.length-validR.length,
    sumKnownR:validR.reduce((sum,t)=>sum+t.realized_r!,0),
  };
}

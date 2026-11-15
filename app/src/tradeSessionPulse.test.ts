import {describe,it,expect} from 'vitest';
import {summarizeSessionTradeExecution} from './tradeSessionPulse';
import type {TradeMetrics} from './services/localApi';
const trade=(id:string,overrides:Partial<TradeMetrics>={}):TradeMetrics=>({
 trade_id:id,session_id:'s1',direction:'LONG',status:'OPEN',average_entry:5000,
 total_entry_quantity:1,total_exit_quantity:0,open_quantity:1,
 latest_stop_price:4990,initial_risk_dollars:500,
 gross_realized_pnl:null,net_realized_pnl:null,realized_r:null,fill_count:1,...overrides
});
describe('session trade execution pulse never invents missing financials',()=>{
 it('distinguishes full, partial, open and unknown outcome without double counting',()=>{
   const rows=[
     trade('a',{status:'CLOSED',total_exit_quantity:1,open_quantity:0,realized_r:1.25,net_realized_pnl:625}),
     trade('b',{status:'CLOSED',total_exit_quantity:1,open_quantity:0,realized_r:null,net_realized_pnl:null}),
     trade('c',{status:'PARTIALLY_CLOSED',total_exit_quantity:1,total_entry_quantity:2,open_quantity:1,realized_r:0.3}),
     trade('d'),
     trade('e',{status:'CLOSED',total_exit_quantity:1,open_quantity:0,realized_r:-0.75,net_realized_pnl:-375}),
   ];
   expect(summarizeSessionTradeExecution(rows)).toEqual({
     totalTrades:5,activeTrades:2,closedTrades:3,partialExitTrades:1,
     knownRTrades:2,unknownRClosedTrades:1,sumKnownR:0.5
   });
 });
 it('does not confuse an unknown R with a zero-R completed trade',()=>{
   const rows=[trade('x',{status:'CLOSED',open_quantity:0,realized_r:0}),
               trade('y',{status:'CLOSED',open_quantity:0,realized_r:null})];
   const p=summarizeSessionTradeExecution(rows);
   expect(p.knownRTrades).toBe(1);
   expect(p.unknownRClosedTrades).toBe(1);
   expect(p.sumKnownR).toBe(0);
   expect(summarizeSessionTradeExecution([]).sumKnownR).toBe(0);
 });
});

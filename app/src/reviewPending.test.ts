import {describe,it,expect} from 'vitest';
import type {TradeMetrics,TradeReview} from './services/localApi';
import {pendingReviewTrades} from './reviewPending';

const trade=(id:string,session_id='session-A',status='CLOSED'):TradeMetrics=>({
  trade_id:id,session_id,status,direction:'LONG',total_entry_quantity:1,
  total_exit_quantity:1,open_quantity:0,fill_count:2,
});
const review=(id:string,status:'DRAFT'|'COMPLETED'):TradeReview=>({
  review_id:'review-'+id,trade_id:id,status,mistake_type_ids:[],
});
describe('deferred review queue derives from actual persisted review status',()=>{
  it('includes unreviewed and draft reviewed CLOSED trades, excluding completed',()=>{
    const rows=[
      {trade:trade('a'),review:null},
      {trade:trade('b'),review:review('b','DRAFT')},
      {trade:trade('c'),review:review('c','COMPLETED')},
      {trade:trade('d','session-A','OPEN'),review:null},
    ];
    expect(pendingReviewTrades('session-A',rows).map(x=>x.trade_id)).toEqual(['a','b']);
  });
  it('never brings stale trades from another session',()=>{
    const rows=[{trade:trade('old','session-OLD'),review:null},{trade:trade('current'),review:null}];
    expect(pendingReviewTrades('session-A',rows).map(x=>x.trade_id)).toEqual(['current']);
  });
  it('does not classify a completed review as pending after reopening its trade',()=>{
    expect(pendingReviewTrades('session-A',[{trade:trade('finished'),review:review('finished','COMPLETED')}])).toEqual([]);
  });
  it('preserves the source list order rather than inventing timestamps',()=>{
    const rows=['z','a','y'].map(id=>({trade:trade(id),review:null}));
    expect(pendingReviewTrades('session-A',rows).map(x=>x.trade_id)).toEqual(['z','a','y']);
  });
});

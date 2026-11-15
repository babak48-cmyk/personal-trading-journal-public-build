import {describe,it,expect} from 'vitest';
import {filterCrossSessionPendingReviews} from './crossSessionReviewQueue';
import type {CrossSessionPendingReview,SessionSummary} from './services/localApi';
const session=(session_id:string,symbol:string,date:string):SessionSummary=>({
  session_id,session_date:date,instrument_symbol:symbol,instrument_display_name:symbol,
  instrument_tick_size:0.25,instrument_point_value:50,instrument_currency:'USD',
  environment:'DEMO',status:'CLOSED',opened_at:date+'T08:00:00'
});
const rows:CrossSessionPendingReview[]=[
 {trade_id:'older-trade',direction:'LONG',review_status:'DRAFT',session:session('s1','ES','2026-11-10')},
 {trade_id:'newer-trade',direction:'SHORT',review_status:'NONE',session:session('s2','GC','2026-11-15')},
];
describe('cross-session Review Pending presentation (server eligibility is authoritative)',()=>{
 it('finds a pending draft in a different session without modifying the original order',()=>{
   expect(filterCrossSessionPendingReviews(rows,'es').map(x=>x.trade_id)).toEqual(['older-trade']);
   expect(filterCrossSessionPendingReviews(rows,'11-15').map(x=>x.trade_id)).toEqual(['newer-trade']);
   expect(filterCrossSessionPendingReviews(rows,'newer-trade').map(x=>x.session.session_id)).toEqual(['s2']);
   expect(filterCrossSessionPendingReviews(rows,'demo').map(x=>x.trade_id)).toEqual(['older-trade','newer-trade']);
   expect(rows[0].trade_id).toBe('older-trade');
 });
 it('bounds visible rows and never manufactures a missing review record',()=>{
   expect(filterCrossSessionPendingReviews(rows,'',1).map(x=>x.trade_id)).toEqual(['older-trade']);
   expect(filterCrossSessionPendingReviews(rows,'',0)).toEqual([]);
   expect(filterCrossSessionPendingReviews(rows,'no-match')).toEqual([]);
 });
});

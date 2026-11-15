import {describe,it,expect} from 'vitest';
import {findClosedReviewTarget} from './reviewBacklogTarget';
import type {TradeMetrics} from './services/localApi';
const trade=(trade_id:string,session_id:string,status:string):TradeMetrics=>({
 trade_id,session_id,direction:'LONG',status,total_entry_quantity:1,
 total_exit_quantity:status==='CLOSED'?1:0,open_quantity:status==='CLOSED'?0:1,fill_count:1
});
describe('cross-session pending Review target identity',()=>{
 it('opens only the exact closed trade for the target session',()=>{
  const saved=[trade('same','session-one','CLOSED'),trade('same','session-two','CLOSED'),trade('open','session-one','OPEN')];
  expect(findClosedReviewTarget('session-two','same',saved)?.session_id).toBe('session-two');
  expect(findClosedReviewTarget('session-one','same',saved)?.session_id).toBe('session-one');
  expect(findClosedReviewTarget('session-one','open',saved)).toBeUndefined();
  expect(findClosedReviewTarget('session-two','absent',saved)).toBeUndefined();
 });
 it('does not mix trades across owners even if identifiers or symbols look similar',()=>{
  const saved=[trade('trade-1','session-A','CLOSED'),trade('trade-2','session-B','CLOSED')];
  expect(findClosedReviewTarget('session-A','trade-2',saved)).toBeUndefined();
 });
});

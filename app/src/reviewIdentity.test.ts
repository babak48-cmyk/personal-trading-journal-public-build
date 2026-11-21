import { describe, expect, it } from 'vitest';
import { isCompletedReviewForTrade } from './reviewIdentity';

describe('review belongs to selected trade', () => {
  const completed = {status: 'COMPLETED'};
  it('never leaks a previously completed review to a different closed trade', () => {
    expect(isCompletedReviewForTrade(completed, 'older-trade', 'new-trade')).toBe(false);
  });
  it('locks only the exact completed trade', () => {
    expect(isCompletedReviewForTrade(completed, 'older-trade', 'older-trade')).toBe(true);
  });
  it('never locks a trade when a stale COMPLETED payload belongs to another persisted trade',()=>{
    expect(isCompletedReviewForTrade({status:'COMPLETED',trade_id:'older-trade'},'new-trade','new-trade')).toBe(false);
    expect(isCompletedReviewForTrade({status:'COMPLETED',trade_id:'new-trade'},'new-trade','new-trade')).toBe(true);
  });
  it('leaves new and draft reviews editable', () => {
    expect(isCompletedReviewForTrade(null, 'new-trade', 'new-trade')).toBe(false);
    expect(isCompletedReviewForTrade({status:'DRAFT'}, 'new-trade', 'new-trade')).toBe(false);
  });
});

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
  it('leaves new and draft reviews editable', () => {
    expect(isCompletedReviewForTrade(null, 'new-trade', 'new-trade')).toBe(false);
    expect(isCompletedReviewForTrade({status:'DRAFT'}, 'new-trade', 'new-trade')).toBe(false);
  });
});

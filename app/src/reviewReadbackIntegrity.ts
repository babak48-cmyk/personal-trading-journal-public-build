import type {TradeReview,TradeRuleCheck} from './services/localApi';

/** Fail closed when an async Review read-back returns another Trade's events.
 * A null Review or Rule Check is a valid "not yet created" state, not a
 * persisted COMPLETED result. */
export function reviewReadbackOwnerIssue(
  selectedTradeId:string,
  loadedTradeId:string,
  review:TradeReview|null,
  ruleCheck:TradeRuleCheck|null,
):string|null{
  if(!selectedTradeId || loadedTradeId!==selectedTradeId)
    return 'Loaded execution belongs to a different Trade.';
  if(review!==null&&review.trade_id!==selectedTradeId)
    return 'Saved Review belongs to a different Trade.';
  if(ruleCheck!==null&&ruleCheck.trade_id!==selectedTradeId)
    return 'Saved rule check belongs to a different Trade.';
  return null;
}

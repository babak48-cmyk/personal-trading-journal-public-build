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

type ReviewReader={
  getTradeReview:(tradeId:string)=>Promise<TradeReview|null>;
  getTradeRuleCheck:(tradeId:string)=>Promise<TradeRuleCheck|null>;
};

export async function readVerifiedTradeReview(api:ReviewReader,selectedTradeId:string,loadedTradeId:string){
  const [review,ruleCheck]=await Promise.all([
    api.getTradeReview(selectedTradeId),
    api.getTradeRuleCheck(selectedTradeId),
  ]);
  const issue=reviewReadbackOwnerIssue(selectedTradeId,loadedTradeId,review,ruleCheck);
  if(issue)throw new Error(issue);
  return {review,ruleCheck};
}

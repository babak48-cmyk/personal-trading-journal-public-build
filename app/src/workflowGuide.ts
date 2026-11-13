/**
 * User-facing labels must make the saved Decision, executed Trade, per-Trade
 * Review and Session Review different destinations. No data model semantics
 * are changed by these presentation-only helpers.
 */
export type QuickJournalPage='PLAN'|'EVIDENCE'|'DECISION'|'EXECUTION'|'REVIEW';
export const JOURNAL_PAGE_LABELS:Readonly<Record<QuickJournalPage,string>>={
  PLAN:'Zones / plan',
  EVIDENCE:'Observed evidence',
  DECISION:'Trade decision',
  EXECUTION:'Execution & trade review',
  REVIEW:'Session review',
};
export type WorkflowSituation={
  sessionTradeCount:number;
  unexecutedDecisionCount:number;
  pendingReviewCount:number|null;
  reviewQueueLoading:boolean;
  reviewQueueError:boolean;
};
export type NextAction={label:string;description:string;destination:QuickJournalPage;action:'NAVIGATE'|'OPEN_REVIEW'};
export function workflowNextAction(s:WorkflowSituation):NextAction{
  if(s.reviewQueueError)return {
    label:'Check saved trade reviews',
    description:'Could not verify which completed trades still need a review. Open execution and retry; do not assume they are completed.',
    destination:'EXECUTION',action:'NAVIGATE',
  };
  if(s.reviewQueueLoading&&s.sessionTradeCount>0)return {
    label:'View trades / check reviews',
    description:'Checking saved trade reviews. The trade list is under Execution & trade review.',
    destination:'EXECUTION',action:'NAVIGATE',
  };
  if(s.pendingReviewCount!==null&&s.pendingReviewCount>0)return {
    label:`Review pending trades (${s.pendingReviewCount})`,
    description:'Open the review for a closed trade. This is different from Session review.',
    destination:'EXECUTION',action:'OPEN_REVIEW',
  };
  if(s.unexecutedDecisionCount>0)return {
    label:`Enter a saved trade (${s.unexecutedDecisionCount})`,
    description:'A TRADE decision is saved, but an actual entry/fill has not been recorded.',
    destination:'EXECUTION',action:'NAVIGATE',
  };
  if(s.sessionTradeCount>0)return {
    label:'View recorded trades',
    description:'Open a trade to manage its fills or review it. Session review is a separate final step.',
    destination:'EXECUTION',action:'NAVIGATE',
  };
  return {
    label:'Choose a zone and record a decision',
    description:'The Trade button on a zone records an intention; it does not execute or create a trade. Actual entries belong under Execution.',
    destination:'PLAN',action:'NAVIGATE',
  };
}

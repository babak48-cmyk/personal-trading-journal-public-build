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
/** Quick stage explanations; purely navigational, no persistence semantics. */
export const JOURNAL_PAGE_PURPOSE:Readonly<Record<QuickJournalPage,{task:string;completion:string}>>={
  PLAN:{
    task:'Prepare or revise saved Zones and their level sources. This is the plan, not proof of what the market did.',
    completion:'A confirmed plan can be revised later; original revisions remain in history.',
  },
  EVIDENCE:{
    task:'Record only market evidence actually observed at a Zone. If nothing was observed, you may leave it empty.',
    completion:'Evidence is saved only after Capture; a planned condition is not observed evidence.',
  },
  DECISION:{
    task:'Record TRADE, NO-TRADE, or MISSED for a Zone. A TRADE decision is not an executed order.',
    completion:'Save the Decision first; an actual trade entry is recorded separately.',
  },
  EXECUTION:{
    task:'Record actual entry and fills; manage a trade or open its own Trade Review after closing.',
    completion:'An individual Trade Review can remain pending without blocking another trade.',
  },
  REVIEW:{
    task:'Review the entire session and record the main lesson. This is separate from every Trade Review.',
    completion:'Complete Session Review only after reviewing the trading day; it does not automatically review individual trades.',
  },
};
export type WorkflowSituation={
  sessionTradeCount:number;
  sessionZoneCount:number;
  unexecutedDecisionCount:number;
  pendingReviewCount:number|null;
  reviewQueueLoading:boolean;
  reviewQueueError:boolean;
};
export type NextAction={label:string;description:string;destination:QuickJournalPage;action:'NAVIGATE'|'OPEN_REVIEW';executionTarget?:'SAVED_DECISIONS'|'TRADES'};
export function workflowNextAction(s:WorkflowSituation):NextAction{
  if(s.reviewQueueError)return {
    label:'Check saved trade reviews',
    description:'Could not verify which completed trades still need a review. Open execution and retry; do not assume they are completed.',
    destination:'EXECUTION',action:'NAVIGATE',executionTarget:'TRADES',
  };
  if(s.reviewQueueLoading&&s.sessionTradeCount>0)return {
    label:'View trades / check reviews',
    description:'Checking saved trade reviews. The trade list is under Execution & trade review.',
    destination:'EXECUTION',action:'NAVIGATE',executionTarget:'TRADES',
  };
  if(s.pendingReviewCount!==null&&s.pendingReviewCount>0)return {
    label:`Review pending trades (${s.pendingReviewCount})`,
    description:'Open the review for a closed trade. This is different from Session review.',
    destination:'EXECUTION',action:'OPEN_REVIEW',
  };
  if(s.unexecutedDecisionCount>0)return {
    label:`Enter a saved trade (${s.unexecutedDecisionCount})`,
    description:'A TRADE decision is saved, but an actual entry/fill has not been recorded.',
    destination:'EXECUTION',action:'NAVIGATE',executionTarget:'SAVED_DECISIONS',
  };
  if(s.sessionTradeCount>0)return {
    label:'View recorded trades',
    description:'Open a trade to manage its fills or review it. Session review is a separate final step.',
    destination:'EXECUTION',action:'NAVIGATE',executionTarget:'TRADES',
  };
  if(s.sessionZoneCount===0)return {
    label:'Add a zone to the current plan',
    description:'There are no saved Zones in this session. Add a live Zone through a timestamped plan revision before recording Zone evidence or decisions.',
    destination:'PLAN',action:'NAVIGATE',
  };
  return {
    label:'Choose a zone and record a decision',
    description:'The Trade button on a zone records an intention; it does not execute or create a trade. Actual entries belong under Execution.',
    destination:'PLAN',action:'NAVIGATE',
  };
}

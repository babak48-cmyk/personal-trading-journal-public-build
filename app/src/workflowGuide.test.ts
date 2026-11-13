import {describe,expect,it} from 'vitest';
import {JOURNAL_PAGE_LABELS,workflowNextAction,type WorkflowSituation} from './workflowGuide';
const empty:WorkflowSituation={sessionTradeCount:0,sessionZoneCount:1,unexecutedDecisionCount:0,pendingReviewCount:0,reviewQueueLoading:false,reviewQueueError:false};
describe('clear lifecycle navigation',()=>{
  it('never names the Decision shortcut as an actual execution',()=>{
    expect(JOURNAL_PAGE_LABELS.DECISION).toMatch(/decision/i);
    expect(JOURNAL_PAGE_LABELS.EXECUTION).toMatch(/execution/i);
    expect(JOURNAL_PAGE_LABELS.REVIEW).toMatch(/session review/i);
    expect(workflowNextAction(empty).description).toMatch(/does not execute/i);
  });
  it('does not send a session without Zones to nonexistent decision controls',()=>{
    expect(workflowNextAction({...empty,sessionZoneCount:0})).toMatchObject({destination:'PLAN',action:'NAVIGATE',label:'Add a zone to the current plan'});
  });
  it('routes saved but unexecuted trade intentions to Execution',()=>{
    expect(workflowNextAction({...empty,unexecutedDecisionCount:2})).toMatchObject({
      destination:'EXECUTION',action:'NAVIGATE',label:'Enter a saved trade (2)',
    });
  });
  it('offers direct pending per-trade review when verified',()=>{
    expect(workflowNextAction({...empty,sessionTradeCount:2,pendingReviewCount:1})).toMatchObject({
      destination:'EXECUTION',action:'OPEN_REVIEW',label:'Review pending trades (1)',
    });
  });
  it('does not imply completed reviews while a queue check fails or is pending',()=>{
    expect(workflowNextAction({...empty,sessionTradeCount:2,pendingReviewCount:null,reviewQueueError:true}).action).toBe('NAVIGATE');
    expect(workflowNextAction({...empty,sessionTradeCount:2,pendingReviewCount:null,reviewQueueLoading:true}).description).toMatch(/checking/i);
  });
  it('keeps the recorded-trade route visible with no pending review',()=>{
    expect(workflowNextAction({...empty,sessionTradeCount:1}).label).toBe('View recorded trades');
  });
});

export type QuickNotebookPage='PLAN'|'EVIDENCE'|'DECISION'|'EXECUTION'|'REVIEW';
export type QuickValidationRoute=Readonly<{
  notebookPage:QuickNotebookPage|null;
  draftStep:number|null;
  draftPlanPage:number|null;
  draftZonePage:number|null;
}>;

/** Show the actual lifecycle stage before focusing the missing control.
 * No state is persisted or cleared by routing. In particular, a hidden Draft
 * Zone is not a missing Zone; it is the same previously entered draft. */
export function quickValidationRoute(
  validationId:string,
  isDraftSession:boolean,
  hasConfirmedPlan:boolean,
):QuickValidationRoute {
  const empty:QuickValidationRoute={notebookPage:null,draftStep:null,draftPlanPage:null,draftZonePage:null};
  // Custom field errors contain stage + immutable owner/field identifiers.
  // Stage routing remains separate from the stored values and history.
  if(validationId.startsWith('custom-required-premarket-plan-')){
    return isDraftSession?{...empty,draftStep:1,draftPlanPage:0}
      :hasConfirmedPlan?{...empty,notebookPage:'PLAN'}:empty;
  }
  if(validationId.startsWith('custom-required-candidate-')||validationId.startsWith('custom-required-zone-')){
    return hasConfirmedPlan?{...empty,notebookPage:'PLAN'}:empty;
  }
  if(validationId.startsWith('custom-required-trade-')||validationId.startsWith('custom-required-post-trade-review-')){
    return hasConfirmedPlan?{...empty,notebookPage:'EXECUTION'}:empty;
  }
  const candidate=validationId.match(/^candidate-(\d+)\./);
  if(isDraftSession && candidate){
    const index=Number(candidate[1]);
    return {...empty,draftStep:2,draftZonePage:Number.isSafeInteger(index)?index:0};
  }
  if(isDraftSession && validationId.startsWith('plan.')){
    return {...empty,draftStep:1,draftPlanPage:['plan.mainScenario','plan.alternativeScenario'].includes(validationId)?1:0};
  }
  if(!hasConfirmedPlan)return empty;
  if(validationId.startsWith('sessionReview.'))return {...empty,notebookPage:'REVIEW'};
  if(validationId.startsWith('evidence.'))return {...empty,notebookPage:'EVIDENCE'};
  if(validationId.startsWith('decision.'))return {...empty,notebookPage:'DECISION'};
  if(['trade.','fill.','management.','review.','rule.','psychology.'].some(prefix=>validationId.startsWith(prefix)))
    return {...empty,notebookPage:'EXECUTION'};
  if(['plan.','planRevision.','liveZone.','zoneRevision.','candidate-','candidate.'].some(prefix=>validationId.startsWith(prefix)))
    return {...empty,notebookPage:'PLAN'};
  return empty;
}

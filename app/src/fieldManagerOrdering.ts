import {orderFieldIdsWithinSection, FIELD_CONTROL_INVENTORY, RENDERED_FIELD_TEXT_IDS, isActiveVisibilityControl, isEditableRequirementControl, fieldConnectionReport} from './fieldInventory';
import {DECISION_DETAILS_ORDER} from './visibleOrderedDecisionFields';
import {EVIDENCE_DETAILS_ORDER} from './visibleOrderedEvidenceFields';
import {SETUP_DEFINITION_FIELD_IDS} from './setupFieldManager';

/**
 * Only sections already wired to a persisted Field Order preference are offered.
 * Ordering is strictly within the existing workflow stage/section.
 * Unsupported inputs remain present in the inventory, but cannot be given a fake order control.
 */
export const SESSION_REVIEW_REFLECTION_ORDER = ['sessionReview.wentWell','sessionReview.nextImprovement','sessionReview.overall'] as const;

/** Preserve old two-field preferences: an unranked Overall stays last. */
export const FIELD_MANAGER_ORDER_SECTIONS = [
 {label:'Setup definition criteria (protected)',ids:SETUP_DEFINITION_FIELD_IDS},
 {label:'Plan scenarios',ids:['plan.mainScenario','plan.alternativeScenario']},
 {label:'Pre-session readiness',ids:['plan.preSessionState','plan.preSessionStateIntensity']},
 {label:'Zone planned conditions',ids:['candidate.requiredConditions','candidate.invalidationConditions']},
 {label:'Observed evidence details',ids:[...EVIDENCE_DETAILS_ORDER]},
 {label:'Decision details',ids:[...DECISION_DETAILS_ORDER]},
 {label:"Session identity",ids:["session.date","session.instrument","session.environment"]},
 {label:"Trade entry",ids:["trade.entryPrice","trade.stopPrice","trade.quantity","trade.plannedTarget"]},
 {label:"Entry costs",ids:["trade.entryCommission","trade.entryFees"]},
 {label:"Fill costs",ids:["fill.commission","fill.fees"]},
 {label:"Stop management",ids:["management.newStop","management.reason"]},
 {label:"Plan revision",ids:["planRevision.bias","planRevision.reason","planRevision.evidence"]},
 {label:"Psychology details",ids:["psychology.state","psychology.stage","psychology.intensity"]},
 {label:"Fill details",ids:["fill.action","fill.price","fill.quantity","fill.reason"]},
 {label:'Trade Review quality and exit',ids:['review.decisionQuality','review.executionQuality','review.managementQuality','review.exitReason']},
 {label:'Trade Review notes',ids:['review.exitNote','review.note']},
 {label:'Session Review assessment',ids:['sessionReview.planQuality','sessionReview.discipline']},
 {label:'Session Review reflection',ids:SESSION_REVIEW_REFLECTION_ORDER},
 {label:'Session Review learning',ids:['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning']},
] as const;

export function managerOrderPosition(id:string, ranks:Readonly<Record<string,number>>):
 {label:string;ids:string[];position:number}|null {
 const section=FIELD_MANAGER_ORDER_SECTIONS.find(section=>section.ids.some(x=>x===id));
 if(!section)return null;
 const ids=orderFieldIdsWithinSection(section.ids,ranks);
 return {label:section.label,ids,position:ids.indexOf(id)};
}


/** Actual editability is per capability, not the legacy aggregate status. */
export function fieldManagerCapabilities(id:string) {
 const requirement=isEditableRequirementControl(id);
 const visibility=isActiveVisibilityControl(id);
 const text=RENDERED_FIELD_TEXT_IDS.some(x=>x===id);
 const order=FIELD_MANAGER_ORDER_SECTIONS.some(section=>section.ids.some(x=>x===id));
 const item=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
 const status=fieldConnectionReport().find(x=>x.id===id)?.status;
 return {requirement,visibility,placement:visibility,text,order,
   editable:requirement||visibility||text||order,
   protected:status==='PROTECTED',
   pending:!!item&&status==='PENDING'};
}

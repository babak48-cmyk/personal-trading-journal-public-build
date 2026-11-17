import {orderFieldIdsWithinSection} from './fieldInventory';
import {DECISION_DETAILS_ORDER} from './visibleOrderedDecisionFields';
import {EVIDENCE_DETAILS_ORDER} from './visibleOrderedEvidenceFields';
import {SETUP_DEFINITION_FIELD_IDS} from './setupFieldManager';

/**
 * Only sections already wired to a persisted Field Order preference are offered.
 * Ordering is strictly within the existing workflow stage/section.
 * Unsupported inputs remain present in the inventory, but cannot be given a fake order control.
 */
export const FIELD_MANAGER_ORDER_SECTIONS = [
 {label:'Setup definition criteria (protected)',ids:SETUP_DEFINITION_FIELD_IDS},
 {label:'Plan scenarios',ids:['plan.mainScenario','plan.alternativeScenario']},
 {label:'Pre-session readiness',ids:['plan.preSessionState','plan.preSessionStateIntensity']},
 {label:'Zone planned conditions',ids:['candidate.requiredConditions','candidate.invalidationConditions']},
 {label:'Observed evidence details',ids:[...EVIDENCE_DETAILS_ORDER]},
 {label:'Decision details',ids:[...DECISION_DETAILS_ORDER]},
 {label:'Trade Review quality and exit',ids:['review.decisionQuality','review.executionQuality','review.managementQuality','review.exitReason']},
 {label:'Trade Review notes',ids:['review.exitNote','review.note']},
 {label:'Session Review assessment',ids:['sessionReview.planQuality','sessionReview.discipline']},
 {label:'Session Review reflection',ids:['sessionReview.wentWell','sessionReview.nextImprovement']},
 {label:'Session Review learning',ids:['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning']},
] as const;

export function managerOrderPosition(id:string, ranks:Readonly<Record<string,number>>):
 {label:string;ids:string[];position:number}|null {
 const section=FIELD_MANAGER_ORDER_SECTIONS.find(section=>section.ids.some(x=>x===id));
 if(!section)return null;
 const ids=orderFieldIdsWithinSection(section.ids,ranks);
 return {label:section.label,ids,position:ids.indexOf(id)};
}

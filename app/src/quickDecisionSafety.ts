/** Only an explicit directional Zone thesis may preselect a TRADE direction.
 * WATCH, CONDITIONAL and UNKNOWN must not inherit a prior attempt or default LONG. */
export type ExplicitTradeDirection='LONG'|'SHORT'|'';
export function directionFromZoneIntent(intent:string|null|undefined):ExplicitTradeDirection{
  return intent==='LONG'||intent==='SHORT'?intent:'';
}

/** A TRADE without an explicit side cannot become an execution intent.
 * NO_TRADE and MISSED never need a trade direction. */
export function missingTradeDirection(direction:ExplicitTradeDirection,decisionType:'TRADE'|'NO_TRADE'|'MISSED'):boolean {
  return decisionType==='TRADE' && direction!=='LONG' && direction!=='SHORT';
}

/** Pending editor values are not a saved Decision.
 * Switching Zones or canceling requires consent only when the user actually entered content. */
export function hasUnsavedDecisionCapture(input:Readonly<{
  note:string;reason:string;quality:string;mismatchReason:string;
  direction:ExplicitTradeDirection;defaultDirection:ExplicitTradeDirection;
  decisionType:'TRADE'|'NO_TRADE'|'MISSED';initialType:'TRADE'|'NO_TRADE'|'MISSED';
}>):boolean{
  return !!input.note.trim()||!!input.reason.trim()||!!input.quality.trim()
    ||!!input.mismatchReason.trim()||input.direction!==input.defaultDirection
    ||input.decisionType!==input.initialType;
}

/** A Zone-card action is navigation too. Use the normal visible Decision
 * leave gate before opening any Evidence owner, even when the clicked Zone
 * differs from the Decision's owner. No draft or event is mutated here. */
export function requiresDecisionLeaveGate(
  currentPage:string,
  decisionEditorOpen:boolean,
  targetPage:string,
):boolean {
  return currentPage==='DECISION' && decisionEditorOpen && targetPage!=='DECISION';
}

/** A direct Zone-card Evidence request may be held behind the visible
 * unsaved-Decision leave gate. Resume only that exact target on an explicit
 * "Continue and keep draft" to EVIDENCE; never fall back to the previous Zone.
 * This is a navigation identity, not a record or a saved trading decision. */
export function confirmedEvidenceZoneDestination(
  confirmedPage:string,
  requestedZoneId:string|null,
):string|null {
  return confirmedPage==='EVIDENCE'&&!!requestedZoneId?.trim()?requestedZoneId:null;
}


/** Pure Quick Capture owner/type transition rule. An unsaved Decision belongs
 * to its exact Zone and decision kind; changing either must use the visible
 * keep/discard flow, not replace the React editor directly. */
export function quickDecisionSwitchDisposition(
  currentZoneId:string|null,
  currentType:'TRADE'|'NO_TRADE'|'MISSED'|null,
  requestedZoneId:string,
  requestedType:'TRADE'|'NO_TRADE'|'MISSED'|null,
  dirty:boolean,
):'SAME'|'PROMPT'|'SWITCH' {
  if(currentZoneId===requestedZoneId &&
     (requestedType===null || currentType===requestedType))return 'SAME';
  return currentZoneId!==null && dirty?'PROMPT':'SWITCH';
}

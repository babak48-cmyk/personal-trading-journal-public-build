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

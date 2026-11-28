/** Reveal the actual destination without changing keyboard focus unless the caller requests it. */
let pulseSequence=0;
export function revealDestination(target:HTMLElement|null|undefined,block:ScrollLogicalPosition='nearest'):void{
  if(!target||!target.getClientRects().length)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({behavior:reduce?'auto':'smooth',block,inline:'nearest'});
  target.classList.remove('ptjDestinationPulse');
  void target.offsetWidth;
  target.classList.add('ptjDestinationPulse');
  const token=String(++pulseSequence);
  target.dataset.ptjPulse=token;
  window.setTimeout(()=>{if(target.dataset.ptjPulse===token){target.classList.remove('ptjDestinationPulse');delete target.dataset.ptjPulse;}},1500);
}
export function shortRecordId(id:string):string{return id.slice(0,8);}
export function zoneIdentity(id:string|null|undefined,label?:string|null):string{
  if(!id)return 'Unplanned';
  return label?.trim()?label+' · '+shortRecordId(id):'Zone '+shortRecordId(id);
}
export function tradeIdentity(trade:{trade_id:string;direction:string;average_entry?:number|null},zone?:string):string{
  return 'Trade '+shortRecordId(trade.trade_id)+' · '+trade.direction+(trade.average_entry!=null?' @ '+trade.average_entry:'')+(zone?' · '+zone:'');
}

// Entry errors are owner-specific. Dropping the old owner's presentation never
// bypasses validation: the next save re-runs every required-field check.
export const entryValidationIds:ReadonlySet<string>=new Set(['trade.entryPrice','trade.stopPrice','trade.quantity','trade.plannedTarget','trade.entryCommission','trade.entryFees']);
export function removeEntryValidation(ids:readonly string[]):string[]{return ids.filter(id=>!entryValidationIds.has(id));}

export function tradeDecisionContext(identity?:import('./services/localApi').TradeRecordIdentity):string{
  if(!identity)return 'Decision context unavailable';
  const parts=[identity.decision_id?'Decision '+shortRecordId(identity.decision_id):'Decision link unavailable',zoneIdentity(identity.candidate_id,identity.zone_label)];
  if(identity.decision_occurred_at)parts.push(identity.decision_occurred_at);
  if(identity.decision_note?.trim())parts.push(identity.decision_note);
  return parts.join(' · ');
}

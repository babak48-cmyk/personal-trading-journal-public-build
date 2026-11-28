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

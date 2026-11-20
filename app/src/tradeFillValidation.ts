import type {TradeEntryIssue} from './tradeEntryValidation';

/** Pre-write validation for manually recorded additional ENTRY and EXIT fills.
 * Prices use the persisted Session instrument snapshot. Do not snap prices,
 * invent a fill, or infer an exit from an unfinished decision.
 */
export function manualFillIssues(input:Readonly<{
  action:'ENTRY'|'EXIT';
  price:number|null;
  quantity:number;
  openQuantity:number;
  tickSize:number;
}>):TradeEntryIssue[]{
  const {action,price,quantity,openQuantity,tickSize}=input;
  const issues:TradeEntryIssue[]=[];
  if(price===null||!Number.isFinite(price)){
    issues.push({id:'fill.price',label:'Enter a finite fill price'});
  }else if(!Number.isFinite(tickSize)||tickSize<=0){
    issues.push({id:'fill.price',label:'Valid saved instrument tick size is required before recording a fill'});
  }else{
    const ticks=price/tickSize;
    if(!Number.isFinite(ticks)||Math.abs(ticks-Math.round(ticks))>1e-8)
      issues.push({id:'fill.price',label:'Fill price must align with the Session instrument tick size'});
  }
  if(!Number.isSafeInteger(quantity)||quantity<=0
     ||(action==='EXIT'&&(!Number.isSafeInteger(openQuantity)||openQuantity<=0||quantity>openQuantity)))
    issues.push({id:'fill.quantity',label:'Enter a positive whole-number quantity; EXIT cannot exceed the remaining open contracts'});
  return issues;
}

/** A stop revision is a distinct, timestamped risk event, not a change to
 * the original stop. Require a valid quote tick before submitting that event.
 */
export function manualStopRevisionIssues(stop:number|null,tickSize:number):TradeEntryIssue[]{
  if(stop===null||!Number.isFinite(stop))
    return [{id:'management.stop',label:'Enter a finite new stop price'}];
  if(!Number.isFinite(tickSize)||tickSize<=0)
    return [{id:'management.stop',label:'Saved instrument tick size must be valid before changing a stop'}];
  const ticks=stop/tickSize;
  if(!Number.isFinite(ticks)||Math.abs(ticks-Math.round(ticks))>1e-8)
    return [{id:'management.stop',label:'New stop price must align with the Session instrument tick size'}];
  return [];
}

/** Pure click-time validation for the manual Trade entry stage.
 * Missing inputs must be reported together so the UI can highlight and focus them.
 * Do not turn null/false/zero into a fabricated trade value. */
export type TradeEntryIssue=Readonly<{id:string;label:string}>;
export function tradeEntryIssues(entryPrice:number|null,stopPrice:number|null,quantity:number,plannedTarget:number|null,targetRequired:boolean):TradeEntryIssue[]{
  const issues:TradeEntryIssue[]=[];
  if(entryPrice===null||!Number.isFinite(entryPrice))issues.push({id:'trade.entryPrice',label:'Entry price'});
  if(stopPrice===null||!Number.isFinite(stopPrice))issues.push({id:'trade.stopPrice',label:'Stop price'});
  if(!Number.isFinite(quantity)||quantity<=0||!Number.isInteger(quantity))issues.push({id:'trade.quantity',label:'Positive whole-number quantity'});
  if(targetRequired&&(plannedTarget===null||!Number.isFinite(plannedTarget)))issues.push({id:'trade.plannedTarget',label:'Planned target'});
  return issues;
}

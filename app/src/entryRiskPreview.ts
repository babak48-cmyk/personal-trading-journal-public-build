import type {TradeEntryIssue} from './tradeEntryValidation';

export type EntryRiskPreview = Readonly<{
  riskDollars:number|null;
  riskTicks:number|null;
  targetRewardDollars:number|null;
  targetGrossR:number|null;
  problems:TradeEntryIssue[];
}>;

/** Pre-entry diagnostic only: uses the immutable session instrument snapshot,
 * never calculates a fill or assumes realized costs / future outcomes. */
export function previewEntryRisk(input:{
  entry:number|null;stop:number|null;quantity:number;
  tickSize:number;pointValue:number;direction:string|null|undefined;
  target?:number|null;
}):EntryRiskPreview{
  const {entry,stop,quantity,tickSize,pointValue,direction,target}=input;
  const problems:TradeEntryIssue[]=[];
  if(!Number.isFinite(tickSize)||tickSize<=0||!Number.isFinite(pointValue)||pointValue<=0){
    return {riskDollars:null,riskTicks:null,targetRewardDollars:null,targetGrossR:null,
      problems:[{id:'trade.entryPrice',label:'Valid instrument tick and point value snapshot required'}]};
  }
  const aligned=(p:number)=>Math.abs(p/tickSize-Math.round(p/tickSize))<=1e-8;
  if(entry!==null&&Number.isFinite(entry)&&!aligned(entry))
    problems.push({id:'trade.entryPrice',label:'Entry must align with the session instrument tick size'});
  if(stop!==null&&Number.isFinite(stop)&&!aligned(stop))
    problems.push({id:'trade.stopPrice',label:'Stop must align with the session instrument tick size'});
  if(entry!==null&&stop!==null&&Number.isFinite(entry)&&Number.isFinite(stop)){
    if(direction==='LONG'&&stop>=entry)problems.push({id:'trade.stopPrice',label:'Long trade stop must be below entry'});
    else if(direction==='SHORT'&&stop<=entry)problems.push({id:'trade.stopPrice',label:'Short trade stop must be above entry'});
    else if(direction!=='LONG'&&direction!=='SHORT')problems.push({id:'trade.stopPrice',label:'A saved long or short decision is required'});
  }
  if(target!==null&&target!==undefined&&Number.isFinite(target)&&!aligned(target))
    problems.push({id:'trade.plannedTarget',label:'Planned target must align with the session tick size'});
  if(entry===null||stop===null||!Number.isFinite(entry)||!Number.isFinite(stop)
    ||!Number.isFinite(quantity)||quantity<=0||!Number.isInteger(quantity)
    ||(direction!=='LONG'&&direction!=='SHORT')||problems.length){
    return {riskDollars:null,riskTicks:null,targetRewardDollars:null,targetGrossR:null,problems};
  }
  const riskDollars=Math.abs(entry-stop)*pointValue*quantity;
  const riskTicks=Math.abs(entry-stop)/tickSize;
  const targetOK=target!==null&&target!==undefined&&Number.isFinite(target);
  const targetRewardDollars=targetOK
    ?(direction==='LONG'?(target!-entry):(entry-target!))*pointValue*quantity:null;
  const targetGrossR=targetRewardDollars!==null&&riskDollars>0?targetRewardDollars/riskDollars:null;
  return {riskDollars,riskTicks,targetRewardDollars,targetGrossR,problems};
}

import type {ExecutionFill} from './services/localApi';

export type OptionalCostResult={valid:true;value:number|null}|{valid:false;reason:string};

/** Costs are TOTAL amounts for this individual fill in the instrument's settlement currency.
 * Empty means UNKNOWN, never silently replace it with zero. */
export function parseOptionalFillCost(raw:string):OptionalCostResult{
  const input=raw.trim();
  if(!input)return {valid:true,value:null};
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(input))return {valid:false,reason:'Enter a non-negative amount, or leave blank if unknown.'};
  const value=Number(input);
  if(!Number.isFinite(value))return {valid:false,reason:'Enter a finite non-negative amount.'};
  return {valid:true,value};
}

export type FillCostCoverage={
  fillCount:number;
  completeFillCount:number;
  unknownFields:number;
  knownCostTotal:number;
  allKnown:boolean;
};
export function fillCostCoverage(fills:readonly ExecutionFill[]):FillCostCoverage{
  let completeFillCount=0,unknownFields=0,knownCostTotal=0;
  for(const fill of fills){
    const commission=fill.commission;
    const fees=fill.fees;
    if(commission==null)unknownFields++;else knownCostTotal+=commission;
    if(fees==null)unknownFields++;else knownCostTotal+=fees;
    if(commission!=null&&fees!=null)completeFillCount++;
  }
  return {fillCount:fills.length,completeFillCount,unknownFields,knownCostTotal,allKnown:unknownFields===0};
}

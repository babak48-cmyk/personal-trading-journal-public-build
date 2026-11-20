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
    const validCommission=commission!=null&&Number.isFinite(commission)&&commission>=0;
    const validFees=fees!=null&&Number.isFinite(fees)&&fees>=0;
    if(!validCommission)unknownFields++;else knownCostTotal+=commission;
    if(!validFees)unknownFields++;else knownCostTotal+=fees;
    if(validCommission&&validFees)completeFillCount++;
  }
  // A sum that overflows is not a known/verified cost total.
  if(!Number.isFinite(knownCostTotal))
    return {fillCount:fills.length,completeFillCount:0,unknownFields:unknownFields+1,knownCostTotal:0,allKnown:false};
  return {fillCount:fills.length,completeFillCount,unknownFields,knownCostTotal,allKnown:unknownFields===0};
}


/** Strict read-only economics disclosure. Historical null costs stay UNKNOWN;
 * invalid or overflowing historical numbers cannot be presented as verified
 * net P&L/R, nor written back as zero. */
export type VerifiedFillCostSummary=Readonly<{
  verifiedTotal:number|null;
  missingFields:number;
  invalidFields:number;
}>;
export function verifiedFillCostSummary(fills:readonly ExecutionFill[]):VerifiedFillCostSummary{
  let total=0,missingFields=0,invalidFields=0;
  for(const fill of fills){
    for(const value of [fill.commission,fill.fees]){
      if(value===null||value===undefined){missingFields++;continue;}
      if(!Number.isFinite(value)||value<0){invalidFields++;continue;}
      total+=value;
      if(!Number.isFinite(total)){invalidFields++;total=NaN;}
    }
  }
  return {verifiedTotal:missingFields===0&&invalidFields===0&&Number.isFinite(total)?total:null,
    missingFields,invalidFields};
}

/** Native ledger remains authoritative for numeric P&L/R. This helper is
 * presentation-only: a native number is not 'verified net' while any cost
 * is missing, invalid or unrepresentable. No exit means no realized return. */
export function verifiedRealizedMetrics(
  fills:readonly ExecutionFill[],
  totalExitQuantity:number,
  nativeNet:number|null,
  nativeR:number|null,
):Readonly<{net:number|null;r:number|null}>{
  if(!Number.isFinite(totalExitQuantity)||totalExitQuantity<=0
     ||fills.length===0||verifiedFillCostSummary(fills).verifiedTotal===null)
    return {net:null,r:null};
  const verifiedNet=nativeNet!==null&&Number.isFinite(nativeNet)?nativeNet:null;
  return {net:verifiedNet,
    r:verifiedNet!==null&&nativeR!==null&&Number.isFinite(nativeR)?nativeR:null};
}

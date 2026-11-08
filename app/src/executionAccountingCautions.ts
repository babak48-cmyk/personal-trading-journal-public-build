import type {ExecutionFill} from './services/localApi';

/** Detect execution sequences which require a chronological cost-basis audit.
 * Historical trades with interleaved fills may now have different derived results
 * under chronological moving-average accounting; original events remain intact. */
export function executionAccountingCautions(fills:readonly ExecutionFill[]):string[]{
  let observedExit=false;
  const issues:string[]=[];
  for(const fill of fills){
    if(fill.action==='EXIT')observedExit=true;
    if(observedExit&&fill.action==='ENTRY'){
      issues.push('Additional entry after an earlier exit: realized P&L now uses the chronological moving-average basis. Previously displayed historical totals for this sequence may change; original fills have not been edited. Review this trade before relying on older exports.');
      break;
    }
  }
  return issues;
}

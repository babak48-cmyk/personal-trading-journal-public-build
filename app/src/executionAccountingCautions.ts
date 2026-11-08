import type {ExecutionFill} from './services/localApi';

/** Detect execution sequences which require a chronological cost-basis audit.
 * The existing backend currently uses the weighted average of ALL entry fills,
 * including entries occurring after earlier exits, when computing realized P&L.
 * This deliberately does NOT alter historical accounting or invent a matching policy. */
export function executionAccountingCautions(fills:readonly ExecutionFill[]):string[]{
  let observedExit=false;
  const issues:string[]=[];
  for(const fill of fills){
    if(fill.action==='EXIT')observedExit=true;
    if(observedExit&&fill.action==='ENTRY'){
      issues.push('Additional entry after an earlier exit: the existing average-entry calculation may change realized P&L from prior exits. Treat net P&L/R as requiring reconciliation.');
      break;
    }
  }
  return issues;
}

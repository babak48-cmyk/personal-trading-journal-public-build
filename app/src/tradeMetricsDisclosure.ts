/** The persisted ledger deducts ALL recorded fill costs to date from gross
 * realized P&L, not a pro-rata allocation to closed quantity. Never imply
 * otherwise for partially open trades. Source: repository.rs execution_ledger.
 */
export type TradePositionDisclosure=Readonly<{
  label:string;
  explanation:string|null;
}>;

export function tradePositionDisclosure(openQuantity:number,totalExitQuantity:number):TradePositionDisclosure {
  if(openQuantity>0 && totalExitQuantity>0) {
    return {
      label:'Net P&L after all costs incurred',
      explanation:'Partially open trade: gross P&L reflects exited quantity; net P&L deducts all recorded entry/exit costs incurred so far, including entry costs relating to contracts still open. This is NOT prorated closed-position net P&L. Net R uses the original trade risk.',
    };
  }
  return {
    label:'Net realized P&L (verified costs)',
    explanation:null,
  };
}

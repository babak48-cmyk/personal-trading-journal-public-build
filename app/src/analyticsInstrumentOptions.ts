/**
 * Build the available Analytics instrument filter options from the instrument
 * registry plus visible historical trade and decision records.
 * Filter options must not disappear merely because the CURRENT result excludes
 * them. Do not rewrite historical instrument snapshots.
 */
export function analyticsInstrumentOptions(
  registered:readonly string[],
  historicalTrades:readonly string[],
  historicalDecisions:readonly string[],
  selected:string|null|undefined,
):string[]{
  const symbols=new Set<string>();
  for(const symbol of [...registered,...historicalTrades,...historicalDecisions,selected??'']){
    const normalized=symbol.trim();
    if(normalized)symbols.add(normalized);
  }
  return [...symbols].sort((a,b)=>a.localeCompare(b));
}

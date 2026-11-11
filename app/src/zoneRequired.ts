import type { CandidateDraftInput } from './services/localApi';
import { isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type ZoneRequiredIssue = Readonly<{id:string;label:string}>;

/** Shared required/geometry checks for pre-session and live Zone capture.
 * Draft editing remains permissive; callers enforce this at confirmation/save.
 * No observed evidence is requested here. This function never mutates the Zone.
 */
export function zoneRequiredIssues(
  candidate:CandidateDraftInput,
  prefix:string,
  overrides:RequirementOverrides,
  suffix='',
):ZoneRequiredIssue[] {
  const missing:ZoneRequiredIssue[]=[];
  const add=(field:string,label:string)=>missing.push({id:`${prefix}.${field}`,label:`${label}${suffix}`});
  if(isUserRequired('candidate.label',overrides)&&!candidate.label?.trim())add('label','Zone name');
  if(isUserRequired('candidate.sources',overrides)&&candidate.sources.length===0)add('sources','Level source');
  if(isUserRequired('candidate.requiredConditions',overrides)&&!candidate.required_conditions.some(x=>x.trim()))
    add('requiredConditions','Need to see');
  if(isUserRequired('candidate.invalidationConditions',overrides)&&!candidate.invalidation_conditions.some(x=>x.trim()))
    add('invalidationConditions','Abandon if');
  if(candidate.price_mode==='RANGE'){
    if(candidate.price_from==null||!Number.isFinite(candidate.price_from))add('priceFrom','Valid range from');
    if(candidate.price_to==null||!Number.isFinite(candidate.price_to))add('priceTo','Valid range to');
  }else if(candidate.price_mode==='SINGLE'){
    if(candidate.reference_price==null||!Number.isFinite(candidate.reference_price))add('price','Valid price');
  }
  return missing;
}

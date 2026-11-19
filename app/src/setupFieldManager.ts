import {orderFieldIdsWithinSection} from './fieldInventory';
import type {SaveSetupVersionInput} from './services/localApi';

/** These Setup definition fields share ONE versioned editor section.
 * Ordering is visual only: never transform the stored Setup version or its semantics.
 * Six fields are required by the Rust save contract ONLY when approving a version.
 */
export const SETUP_DEFINITION_FIELDS = [
  {id:'setup.marketContext',key:'market_context',label:'Market regime/context',hint:'e.g. Range boundary rejection vs acceptance',approvalRequired:true},
  {id:'setup.zoneLocation',key:'zone_location',label:'Location / relevant Zone',hint:'e.g. prior value-area low with provenance',approvalRequired:true},
  {id:'setup.prerequisites',key:'prerequisites',label:'Prerequisite conditions',hint:'Must exist before considering entry',approvalRequired:true},
  {id:'setup.entryTriggers',key:'entry_triggers',label:'Critical entry triggers',hint:'Timestamped observation required; not a signal',approvalRequired:true},
  {id:'setup.supportingEvidence',key:'supporting_evidence',label:'Supporting confirmations',hint:'Optional observations that strengthen the thesis',approvalRequired:false},
  {id:'setup.contraryEvidence',key:'contrary_evidence',label:'Contradictory / veto evidence',hint:'What conflicts with this thesis; include explicit veto',approvalRequired:true},
  {id:'setup.invalidation',key:'thesis_invalidation',label:'Thesis invalidation',hint:'Separate from an order stop price',approvalRequired:true},
] as const satisfies readonly {
  id:string;key:keyof SaveSetupVersionInput;label:string;hint:string;approvalRequired:boolean
}[];

export const SETUP_DEFINITION_FIELD_IDS = SETUP_DEFINITION_FIELDS.map(f=>f.id);

export function orderedSetupDefinitionFields(ranks:Readonly<Record<string,number>>) {
  const byId=new Map<string,(typeof SETUP_DEFINITION_FIELDS)[number]>(SETUP_DEFINITION_FIELDS.map(f=>[f.id,f]));
  return orderFieldIdsWithinSection(SETUP_DEFINITION_FIELD_IDS,ranks).map(id=>byId.get(id)!);
}

/** Enforce the same six conditions already enforced by Rust for APPROVE.
 * This helper is for explanatory UI; Rust remains the authoritative save gate.
 */
export function setupApprovalMissingFields(input:SaveSetupVersionInput):string[] {
  return SETUP_DEFINITION_FIELDS.filter(f=>f.approvalRequired&&!input[f.key]?.trim()).map(f=>f.id);
}


/** Action-adjacent, pre-IPC feedback for an incomplete Approve. Draft remains
 * permissive; the native Rust approval gate remains authoritative.
 */
export function setupApprovalActionFeedback(
  input:SaveSetupVersionInput,
  labelFor:(id:string,fallback:string)=>string,
):string|null {
  const missing=setupApprovalMissingFields(input);
  if(!missing.length)return null;
  const names=missing.map(id=>{
    const definition=SETUP_DEFINITION_FIELDS.find(field=>field.id===id)!;
    return labelFor(id,definition.label);
  });
  return 'Approval not submitted: complete '+missing.length+
    ' required Setup definition field(s): '+names.join(', ')+
    '. Draft save remains available.';
}

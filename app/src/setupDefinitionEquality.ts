import type {SaveSetupVersionInput,SetupVersion} from './services/localApi';

export function sameSetupDefinition(input:SaveSetupVersionInput, saved:SetupVersion,approve:boolean){
 const normal=(v:string|null|undefined)=>(v??'').trim();
 return input.setup_id===saved.setup_id && normal(input.name)===normal(saved.name)
  && input.source_trade_id===saved.source_trade_id && approve===saved.is_approved
  && (['market_context','zone_location','prerequisites','entry_triggers','supporting_evidence','contrary_evidence','thesis_invalidation','notes'] as const)
   .every(k=>normal(input[k])===normal(saved[k]))
  && input.evidence_priorities.length===saved.evidence_priorities.length
  && input.evidence_priorities.every((e,i)=>e.evidence_label.trim().toLowerCase()===saved.evidence_priorities[i].evidence_label.trim().toLowerCase()
   && e.priority_role===saved.evidence_priorities[i].priority_role && normal(e.explanation)===normal(saved.evidence_priorities[i].explanation));
}


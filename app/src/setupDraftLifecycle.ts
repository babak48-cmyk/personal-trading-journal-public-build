import type {SaveSetupVersionInput,SetupVersion} from './services/localApi';

/** A blank selection must NOT keep the setup_id of an older immutable version. */
export function blankSetupDraft():SaveSetupVersionInput{
 return {setup_id:null,name:'',source_trade_id:null,market_context:null,zone_location:null,
   prerequisites:null,entry_triggers:null,supporting_evidence:null,contrary_evidence:null,
   thesis_invalidation:null,notes:null,evidence_priorities:[],approve:false};
}

export function setupDraftFromVersion(v:SetupVersion):SaveSetupVersionInput{
 return {setup_id:v.setup_id,name:v.name,source_trade_id:v.source_trade_id,
   market_context:v.market_context,zone_location:v.zone_location,
   prerequisites:v.prerequisites,entry_triggers:v.entry_triggers,
   supporting_evidence:v.supporting_evidence,contrary_evidence:v.contrary_evidence,
   thesis_invalidation:v.thesis_invalidation,notes:v.notes,
   evidence_priorities:v.evidence_priorities.map(x=>({...x})),approve:false};
}

export type SetupSwitchResult=Readonly<{selectedVersion:string;draft:SaveSetupVersionInput}>;
/** Fail closed for an unknown ID: never leave stale Setup linkage in the draft. */
export function setupSwitchDraft(versions:readonly SetupVersion[],versionId:string):SetupSwitchResult{
 const existing=versions.find(v=>v.version_id===versionId);
 return existing?{selectedVersion:existing.version_id,draft:setupDraftFromVersion(existing)}
   :{selectedVersion:'',draft:blankSetupDraft()};
}

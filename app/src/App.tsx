import { open } from '@tauri-apps/plugin-dialog';
import { evidenceRequiredIssues } from './evidenceValidation';
import { quickValidationRoute } from './quickValidationRoute';
import { tradeEntryIssues } from './tradeEntryValidation';
import { previewEntryRisk } from './entryRiskPreview';
import { executionAccountingCautions } from './executionAccountingCautions';
import { parseOptionalFillCost, fillCostCoverage } from './fillCosts';
import { pendingReviewTrades } from './reviewPending';
import { attachmentCaptionIssue } from './attachmentCaptionValidation';
import { planRevisionEvidenceIssues } from './planRevisionValidation';
import { sessionReviewRequiredIssues } from './sessionReviewValidation';
import { reviewCompletionIssues } from './reviewCompletion';
import { isCompletedReviewForTrade } from './reviewIdentity';
import { CAPTURABLE_CUSTOM_FIELD_STAGES, canCaptureCustomFieldStage, eligibleCustomFields, customFieldFocusId, type CustomFieldOwnerStage } from './customFieldStage';
import { missingRequiredCustomValues } from './customFieldRequired';
import { fieldConnectionReport, fieldConnectionSummary } from './fieldInventory';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  localApi,
  type CandidateDraftInput,
  type CandidateDecision,
  type CurrentCandidate,
  type CurrentPlan,
  type EvidenceObservation,
  type EvidenceType,
  type LevelSourceType,
  type Instrument,
  type PlanConsistency,
  type SessionSummary,
  type TimelineEvent,
  type TradeDetail,
  type TradeMetrics,
  type MistakeType,
  type TradeReview,
  type RuleItem,
  type TradeRuleCheck,
  type SessionReviewSummary,
  type SessionReview,
  type JournalFilter,
  type JournalTradeRow,
  type AnalyticsSummary,
  type MistakeSummary,
  type Attachment,
  type RuntimeReadiness,
  type BetaSelfTestResult,
} from './services/localApi';
import { FIELD_DEFINITIONS, FIELD_DEFINITION_BY_ID, type RequirementOverrides, isUserRequired, requirementLabel } from './fieldDefinitions';
import { DEFAULT_APPEARANCE, normalizeAppearance, resolvedTheme, type AppearancePreferences } from './appearance';
import { FIELD_CONTROL_INVENTORY, ACTIVE_VISIBILITY_FIELD_IDS, isActiveVisibilityControl, isFieldPresented, isFieldShown, orderFieldIdsWithinSection, type FieldPlacement } from './fieldInventory';

const emptyCandidate = (identified_when: CandidateDraftInput['identified_when'] = 'PRE_SESSION'): CandidateDraftInput => ({
  label: '', directional_intent: 'LONG', trend_relationship: 'WITH_TREND', price_mode: 'RANGE',
  price_from: null, price_to: null, reference_price: null, identified_when,
  required_conditions: [], invalidation_conditions: [], notes: '', sources: [],
});

const ACTIVE_STATES = new Set(['PLANNED', 'WATCHING', 'REACHED', 'VALID']);
const ATTACHMENT_STAGES = ['PRE_MARKET','PRE_ENTRY','ENTRY','DURING','POST_EXIT','FOLLOW_UP','ORDER_FLOW','OTHER'] as const;
const cleanLines=(lines:string[])=>lines.map(x=>x.trim()).filter(Boolean);
const cleanCandidate=(c:CandidateDraftInput):CandidateDraftInput=>({...c,required_conditions:cleanLines(c.required_conditions),invalidation_conditions:cleanLines(c.invalidation_conditions)});
const sydneyToday=()=>{const parts=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(t:string)=>parts.find(p=>p.type===t)?.value??'';return `${get('year')}-${get('month')}-${get('day')}`;};
type ValidationIssue={id:string;label:string};

type RoadmapStatus = 'WINDOWS-TESTED'|'PARTIAL'|'PROPOSED'|'CONDITIONAL'|'NOT IMPLEMENTED';
const roadmapGroups:{title:string;status:RoadmapStatus;purpose:string;remaining:string[]}[]=[
 {title:'1. Quick Workflow & Page Redesign',status:'PARTIAL',purpose:'Short sequential notebook pages from Session through Review, with only relevant fields on each page.',remaining:['Redesign long Initial Plan and draft Zone forms','One focused short page at a time with safe Next / Previous and missing required field navigation','Reduce repeated navigation and prove fast Windows usage before UX acceptance']},
 {title:'2. Planning & Zones',status:'PARTIAL',purpose:'Capture session scenarios, Zone provenance and timestamped plan revisions separately from observed evidence.',remaining:['Simplify pre-session form','Validate lifecycle and Zone revisions end to end']},
 {title:'3. Full All-Inputs Field Manager',status:'PARTIAL',purpose:'Control field visibility, required/optional rules, order, Quick/Detailed placement, labels and help across ALL inputs.',remaining:['Close all-input coverage and ordering gaps','Safe conditional/system-required behavior','Windows acceptance without losing hidden history']},
 {title:'4. Custom Fields & Options',status:'PARTIAL',purpose:'Personal typed fields and options with persistence, migrations and historical option snapshots.',remaining:['Verify coverage and safe deactivation','Complete historical snapshots and analytics inclusion']},
 {title:'5. Decisions & Evidence',status:'PARTIAL',purpose:'Fast observed evidence and TRADE / NO_TRADE / MISSED decisions, with reasons and timestamps.',remaining:['Fewer steps and less clutter in Quick','Windows end-to-end acceptance; preserve decision versus execution']},
 {title:'6. Execution & Trade Management',status:'PARTIAL',purpose:'Real entry, stop, target, quantity, fills, partial exits, costs and independent re-entries.',remaining:['Make entry form easy to find','Validate actual fills, risk and re-entries without invented data']},
 {title:'7. Psychology & Review',status:'PARTIAL',purpose:'Exception-based psychology, rule adherence and useful review after execution.',remaining:['Reduce unnecessary prompts during trading','Verify deferred review path and completion rules']},
 {title:'8. Audited Data Correction',status:'NOT IMPLEMENTED',purpose:'Correct mistakes without overwriting original records; maintain timestamps and audit trail.',remaining:['Implement authorized audited correction workflow','Test migration and data safety separately']},
 {title:'9. Analytics & Weekly Learning',status:'PARTIAL',purpose:'Costs/net P&L/R, setup and context breakdown, mistakes, missed trades and weekly actions.',remaining:['Complete traceable metrics with sample sizes','Build concise actionable weekly review']},
 {title:'10. Setup Playbook',status:'PROPOSED',purpose:'Optional setup-specific conditions, priorities, contrary evidence and invalidation.',remaining:['Agree scope and value before implementing','Do not imply unvalidated thresholds are an edge']},
 {title:'11. NinjaTrader Import',status:'CONDITIONAL',purpose:'Optional manual export/import with verified trade identity and deduplication.',remaining:['Requires separate value/authorization decision','Test identity, duplicate prevention and data safety']},
 {title:'12. Stability & Windows Release',status:'PARTIAL',purpose:'Safe data paths, migrations, CI, native Windows installer and actual installed acceptance.',remaining:['CI PASS does not equal Windows PASS','Close blocking UX and data-safety gates before release']}
];
function FeatureRoadmapPanel({onClose}:{onClose:()=>void}){
 return <section className="panel" aria-label="Feature roadmap implementation status" style={{maxWidth:980,margin:'0 auto'}}>
   <div className="panelTitle"><div><h2>Feature Roadmap · Implementation Status</h2><p className="subtle">Feature-family overview; the approved Master Requirements and roadmap remain authoritative. No unfinished requirement is removed.</p></div><button type="button" onClick={onClose}>Back to journal</button></div>
   <p><strong>Priority 1: Quick Workflow & Page Redesign — UX NOT ACCEPTED.</strong> Short, sequential pages must work from the initial draft, not just after plan confirmation.</p>
   <p className="subtle"><strong>Completion rule:</strong> A feature remains open until every approved requirement is traced, implemented, appropriately CI/Windows-tested, and explicitly accepted by the user. A small independent remaining item may be prioritized without removing dependencies or skipping tests. No automatic closure.</p>
   <p className="subtle"><strong>Counting rule:</strong> The numbers below count only topics currently listed in this overview, NOT all approved requirements. Exact required/completed/outstanding counts and independent closure readiness are UNKNOWN until reconciled with the complete Master Requirements and verified source/evidence.</p>
   {roadmapGroups.map((item,i)=><details key={item.title} open={i===0} style={{borderBottom:'1px solid #9994',padding:'12px 0'}}>
     <summary style={{cursor:'pointer',fontWeight:650}}>{item.title} · {item.status}</summary>
     <p>{item.purpose}</p><p className="subtle"><strong>Listed open topics:</strong> {item.remaining.length} · <strong>Verified full requirement count:</strong> pending reconciliation · <strong>Independent closure readiness:</strong> not established.</p><ul>{item.remaining.map(task=><li key={task}>{task}</li>)}</ul>
   </details>)}
   <p className="subtle">Statuses are intentionally conservative: implemented, CI-tested, Windows-tested and user-accepted are separate gates. No action is triggered by this overview.</p>
 </section>;
}

export function App(){
  const [sessions,setSessions]=useState<SessionSummary[]>([]);
  const [lastOpenedSessionId,setLastOpenedSessionId]=useState(()=>{try{return window.localStorage.getItem('ptj.lastOpenedSessionId')??'';}catch{return '';}});
  function rememberOpenedSession(id:string){setLastOpenedSessionId(id);try{window.localStorage.setItem('ptj.lastOpenedSessionId',id);}catch{}}
  const [instruments,setInstruments]=useState<Instrument[]>([]);
  const [sources,setSources]=useState<LevelSourceType[]>([]);
  const [evidenceTypes,setEvidenceTypes]=useState<EvidenceType[]>([]);
  const [active,setActive]=useState<SessionSummary|null>(null);
  const [plan,setPlan]=useState<CurrentPlan|null>(null);
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const [consistency,setConsistency]=useState<PlanConsistency|null>(null);
  const [message,setMessage]=useState('Local desktop build — planning core checkpoint');
  const [backupBusy,setBackupBusy]=useState(false);
  const [backupResult,setBackupResult]=useState('');
  async function createBackupWithFeedback(){
    if(backupBusy)return;
    setBackupBusy(true);setBackupResult('');
    try{const path=await localApi.createBackup();setBackupResult('Backup created successfully: '+path);setMessage('Backup created successfully.');await refreshSafety();}
    catch(e){setBackupResult('Backup failed: '+String(e));}finally{setBackupBusy(false);}
  }
  const [showGuide,setShowGuide]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showRoadmap,setShowRoadmap]=useState(false);
  const [settingsSection,setSettingsSection]=useState<'APPEARANCE'|'INSTRUMENTS'|'SOURCES'|'REQUIREMENTS'>('APPEARANCE');
  const [appearance,setAppearance]=useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [prefersDark,setPrefersDark]=useState(false);
  const [requirementOverrides,setRequirementOverrides]=useState<RequirementOverrides>({});
  const [fieldVisibility,setFieldVisibility]=useState<Record<string,boolean>>({});
  const [fieldPlacements,setFieldPlacements]=useState<Record<string,FieldPlacement>>({});
  const [fieldOrder,setFieldOrder]=useState<Record<string,number>>({});
  const [fieldText,setFieldText]=useState<Record<string,{label?:string;help?:string}>>({});
  const [validationErrors,setValidationErrors]=useState<string[]>([]);
  const [validationIssueLabels,setValidationIssueLabels]=useState<Record<string,string>>({});
  const [showDraftSetup,setShowDraftSetup]=useState(false);
  const [draftStep,setDraftStep]=useState(1);
  const [draftZonePage,setDraftZonePage]=useState(0);
  const [draftPlanPage,setDraftPlanPage]=useState(0);
  const [draftBusy,setDraftBusy]=useState(false);
  const draftSaveInFlightRef=useRef(false);
  const confirmingPlanRef=useRef(false);
  const [confirmingPlan,setConfirmingPlan]=useState(false);
  const [draftSaveFeedback,setDraftSaveFeedback]=useState('');
  const [draftDirty,setDraftDirty]=useState(false);

  const [date,setDate]=useState(sydneyToday());
  const [instrument,setInstrument]=useState('ES');
  const [environment,setEnvironment]=useState<'REAL'|'DEMO'|'FORWARD_TEST'>('DEMO');
  const [bias,setBias]=useState<'LONG'|'SHORT'|'NEUTRAL'|'MIXED'|'UNKNOWN'>('MIXED');
  const [mainScenario,setMainScenario]=useState('');
  const [altScenario,setAltScenario]=useState('');
  const [preSessionState,setPreSessionState]=useState('');
  const [preSessionStateIntensity,setPreSessionStateIntensity]=useState<number|null>(null);
  const [candidates,setCandidates]=useState<CandidateDraftInput[]>([emptyCandidate()]);

  const [showPlanUpdate,setShowPlanUpdate]=useState(false);
  const [newBias,setNewBias]=useState('');
  const [planReason,setPlanReason]=useState('');
  const [planEvidence,setPlanEvidence]=useState('');

  const [editing,setEditing]=useState<CurrentCandidate|null>(null);
  const [editIntent,setEditIntent]=useState('LONG');
  const [editFrom,setEditFrom]=useState<number|null>(null);
  const [editTo,setEditTo]=useState<number|null>(null);
  const [editSingle,setEditSingle]=useState<number|null>(null);
  const [editReason,setEditReason]=useState('');
  const [editSourceIds,setEditSourceIds]=useState<string[]>([]);

  const [showLiveCandidate,setShowLiveCandidate]=useState(false);
  const [liveCandidate,setLiveCandidate]=useState<CandidateDraftInput>(emptyCandidate('DURING_SESSION'));
  const [liveCandidateReason,setLiveCandidateReason]=useState('');
  const [liveCandidateEvidence,setLiveCandidateEvidence]=useState('');

  const [evidenceCandidate,setEvidenceCandidate]=useState<CurrentCandidate|null>(null);
  const [selectedEvidenceIds,setSelectedEvidenceIds]=useState<string[]>([]);
  const [evidenceStances,setEvidenceStances]=useState<Record<string,'GENERAL_OBSERVATION'|'SETUP_SUPPORT'|'CONTRADICTING_EVIDENCE'|'ENTRY_CONFIRMATION'|'INVALIDATION'>>({});
  const [savedEvidenceIds,setSavedEvidenceIds]=useState<string[]>([]);
  const [evidenceDirection,setEvidenceDirection]=useState<'BUY'|'SELL'|'NEUTRAL'|''>('');
  const [evidencePrice,setEvidencePrice]=useState<number|null>(null);
  const [evidenceNote,setEvidenceNote]=useState('');
  const evidenceSavingRef=useRef(false);
  const [evidenceSaving,setEvidenceSaving]=useState(false);
  const [evidenceSaved,setEvidenceSaved]=useState(false);
  const [evidenceFeedback,setEvidenceFeedback]=useState('');
  const [candidateEvidence,setCandidateEvidence]=useState<Record<string,EvidenceObservation[]>>({});
  const [quickMode,setQuickMode]=useState(true);
  const [decisionCandidate,setDecisionCandidate]=useState<CurrentCandidate|null>(null);
  const decisionSavingRef=useRef(false);
  const [decisionSaving,setDecisionSaving]=useState(false);
  const [decisionSaveFeedback,setDecisionSaveFeedback]=useState('');
  const [lastDecisionNotice,setLastDecisionNotice]=useState('');
  const [quickZoneId,setQuickZoneId]=useState('');
  const [notebookPage,setNotebookPage]=useState<'PLAN'|'EVIDENCE'|'DECISION'|'EXECUTION'|'REVIEW'>('PLAN');
  const [notebookMaxPage,setNotebookMaxPage]=useState(0);
  const [decisionType,setDecisionType]=useState<'TRADE'|'NO_TRADE'|'MISSED'>('TRADE');
  const [decisionDirection,setDecisionDirection]=useState<'LONG'|'SHORT'>('LONG');
  const [decisionReason,setDecisionReason]=useState('');
  const [decisionNote,setDecisionNote]=useState('');
  const [decisionQuality,setDecisionQuality]=useState<'A'|'B'|'C'|'INVALID'|'UNCLEAR'|''>('');
  const [mismatchReason,setMismatchReason]=useState('');
  const [candidateDecisions,setCandidateDecisions]=useState<Record<string,CandidateDecision[]>>({});
  const [pendingTradeDecision,setPendingTradeDecision]=useState<CandidateDecision|null>(null);
  const tradeOpeningRef=useRef(false);
  const [tradeOpening,setTradeOpening]=useState(false);
  const [tradeOpeningFeedback,setTradeOpeningFeedback]=useState('');
  const [entryPrice,setEntryPrice]=useState<number|null>(null);
  const [stopPrice,setStopPrice]=useState<number|null>(null);
  const [tradeQty,setTradeQty]=useState<number>(1);
  const [plannedTarget,setPlannedTarget]=useState<number|null>(null);
  const [entryCommissionInput,setEntryCommissionInput]=useState('');
  const [entryFeesInput,setEntryFeesInput]=useState('');
  const [activeTrade,setActiveTrade]=useState<TradeDetail|null>(null);
  const [sessionTrades,setSessionTrades]=useState<TradeMetrics[]>([]);
  const [reviewQueue,setReviewQueue]=useState<TradeMetrics[]|null>(null);
  const [reviewQueueLoading,setReviewQueueLoading]=useState(false);
  const [reviewQueueError,setReviewQueueError]=useState('');
  const [reviewQueueSessionId,setReviewQueueSessionId]=useState<string|null>(null);
  const [reviewQueueRefreshToken,setReviewQueueRefreshToken]=useState(0);
  const reviewQueueRequestRef=useRef(0);
  // Automatically reconcile the review queue from persisted Review records for this
  // exact session. Never reuse an old request's answer after a session switch.
  useEffect(()=>{
    const sessionId=active?.session_id??null;
    const request=++reviewQueueRequestRef.current;
    setReviewQueue(null);setReviewQueueSessionId(null);setReviewQueueError('');
    if(!sessionId||active?.status==='DRAFT'){setReviewQueueLoading(false);return;}
    const closed=sessionTrades.filter(t=>t.session_id===sessionId&&t.status==='CLOSED');
    if(!closed.length){setReviewQueue([]);setReviewQueueSessionId(sessionId);setReviewQueueLoading(false);return;}
    let cancelled=false;
    setReviewQueueLoading(true);
    Promise.all(closed.map(async trade=>({trade,review:await localApi.getTradeReview(trade.trade_id)})))
      .then(rows=>{
        if(cancelled||request!==reviewQueueRequestRef.current)return;
        setReviewQueue(pendingReviewTrades(sessionId,rows));
        setReviewQueueSessionId(sessionId);
      }).catch(e=>{
        if(cancelled||request!==reviewQueueRequestRef.current)return;
        setReviewQueue(null);setReviewQueueSessionId(null);
        setReviewQueueError('Could not verify pending reviews. Retry before relying on this list: '+String(e));
      }).finally(()=>{
        if(!cancelled&&request===reviewQueueRequestRef.current)setReviewQueueLoading(false);
      });
    return ()=>{cancelled=true;};
  },[active?.session_id,active?.status,sessionTrades,reviewQueueRefreshToken]);
  const [fillAction,setFillAction]=useState<'ENTRY'|'EXIT'>('EXIT');
  const [fillPrice,setFillPrice]=useState<number|null>(null);
  const [fillQty,setFillQty]=useState<number>(1);
  const [fillReason,setFillReason]=useState('');
  const [fillCommissionInput,setFillCommissionInput]=useState('');
  const [fillFeesInput,setFillFeesInput]=useState('');
  const fillSavingRef=useRef(false);
  const [fillSaving,setFillSaving]=useState(false);
  const [fillFeedback,setFillFeedback]=useState('');
  const stopSavingRef=useRef(false);
  const [stopSaving,setStopSaving]=useState(false);
  const [stopFeedback,setStopFeedback]=useState('');
  const sessionReviewSavingRef=useRef(false);
  const [sessionReviewSaving,setSessionReviewSaving]=useState(false);
  const [sessionReviewFeedback,setSessionReviewFeedback]=useState('');
  const planRevisionSavingRef=useRef(false);
  const [planRevisionSaving,setPlanRevisionSaving]=useState(false);
  const [planRevisionFeedback,setPlanRevisionFeedback]=useState('');
  // Async mutation guards prevent double-clicks from writing duplicate audit events.
  const draftSetupSavingRef=useRef(false);
  const [draftSetupSaving,setDraftSetupSaving]=useState(false);
  const [draftSetupFeedback,setDraftSetupFeedback]=useState('');
  const zoneRevisionSavingRef=useRef(false);
  const [zoneRevisionSaving,setZoneRevisionSaving]=useState(false);
  const [zoneRevisionFeedback,setZoneRevisionFeedback]=useState('');
  const liveZoneSavingRef=useRef(false);
  const [liveZoneSaving,setLiveZoneSaving]=useState(false);
  const [liveZoneFeedback,setLiveZoneFeedback]=useState('');
  const zoneStatusSavingRef=useRef(false);
  const [zoneStatusSavingId,setZoneStatusSavingId]=useState<string|null>(null);
  const [zoneStatusFeedback,setZoneStatusFeedback]=useState('');
  const [zoneStatusFeedbackId,setZoneStatusFeedbackId]=useState<string|null>(null);
  const [newStop,setNewStop]=useState<number|null>(null);
  const [stopReason,setStopReason]=useState('');
  const [mistakeTypes,setMistakeTypes]=useState<MistakeType[]>([]);
  const [tradeReview,setTradeReview]=useState<TradeReview|null>(null);
  const [reviewOwnerTradeId,setReviewOwnerTradeId]=useState<string|null>(null);
  const reviewSelectionRequestRef=useRef(0);
  // Review status is trusted only after the relevant trade's persisted state was read.
  const [reviewVerifiedTradeId,setReviewVerifiedTradeId]=useState<string|null>(null);
  const reviewSavingRef=useRef(false);
  const [reviewSaving,setReviewSaving]=useState(false);
  const [reviewFeedback,setReviewFeedback]=useState('');
  const [reviewDecisionQuality,setReviewDecisionQuality]=useState<'A'|'B'|'C'|'INVALID'|'UNCLEAR'|''>('');
  const [reviewExecutionQuality,setReviewExecutionQuality]=useState<'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'UNCLEAR'|''>('');
  const [reviewManagementQuality,setReviewManagementQuality]=useState<'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'UNCLEAR'|''>('');
  const [reviewExitReason,setReviewExitReason]=useState('');
  const [reviewExitNote,setReviewExitNote]=useState('');
  const [emotionAffected,setEmotionAffected]=useState<boolean|null>(null);
  const [psychState,setPsychState]=useState('');
  const [psychIntensity,setPsychIntensity]=useState<number|null>(null);
  const [psychStage,setPsychStage]=useState<'ENTRY'|'MANAGEMENT'|'EXIT'|'MULTIPLE'|''>('');
  const [reviewMistakes,setReviewMistakes]=useState<string[]>([]);
  const [reviewNote,setReviewNote]=useState('');
  const [rules,setRules]=useState<RuleItem[]>([]);
  const [tradeRuleCheck,setTradeRuleCheck]=useState<TradeRuleCheck|null>(null);
  const [ruleViolationReported,setRuleViolationReported]=useState<boolean|null>(null);
  const [violatedRuleIds,setViolatedRuleIds]=useState<string[]>([]);
  const [ruleNote,setRuleNote]=useState('');
  const [showSessionReview,setShowSessionReview]=useState(false);
  const [sessionReviewSummary,setSessionReviewSummary]=useState<SessionReviewSummary|null>(null);
  const [sessionReview,setSessionReview]=useState<SessionReview|null>(null);
  const [srWentWell,setSrWentWell]=useState('');
  const [srWentPoorly,setSrWentPoorly]=useState('');
  const [srBestDecision,setSrBestDecision]=useState('');
  const [srBiggestMistake,setSrBiggestMistake]=useState('');
  const [srMarketLearning,setSrMarketLearning]=useState('');
  const [srNextImprovement,setSrNextImprovement]=useState('');
  const [srOverall,setSrOverall]=useState<'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|''>('');
  const [srPlanQuality,setSrPlanQuality]=useState<'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|''>('');
  const [srDiscipline,setSrDiscipline]=useState<'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|''>('');
  const [showAnalysis,setShowAnalysis]=useState(false);
  const [journalFilter,setJournalFilter]=useState<JournalFilter>({});
  const [journalRows,setJournalRows]=useState<JournalTradeRow[]>([]);
  const [analytics,setAnalytics]=useState<AnalyticsSummary|null>(null);
  const [mistakeSummary,setMistakeSummary]=useState<MistakeSummary[]>([]);
  const [runtimeReadiness,setRuntimeReadiness]=useState<RuntimeReadiness|null>(null);
  const [showSafety,setShowSafety]=useState(false);
  const [betaSelfTest,setBetaSelfTest]=useState<BetaSelfTestResult|null>(null);
  const [betaSelfTestBusy,setBetaSelfTestBusy]=useState(false);

  useEffect(()=>{
    refresh();
    localApi.listInstruments().then(v=>{setInstruments(v);setInstrument(current=>v.some(x=>x.symbol===current)?current:(v[0]?.symbol??''));}).catch(()=>{});
    localApi.getFieldRequirementOverrides().then(setRequirementOverrides).catch(()=>{});
    localApi.getFieldVisibilityPreferences().then(setFieldVisibility).catch(()=>{});
    localApi.getFieldPlacementPreferences().then(setFieldPlacements).catch(()=>{});
    localApi.getFieldOrderPreferences().then(setFieldOrder).catch(()=>{});
    localApi.getFieldTextPreferences().then(setFieldText).catch(()=>{});
    localApi.getAppearancePreferences().then(v=>setAppearance(normalizeAppearance(v))).catch(()=>{});
    localApi.listLevelSources().then(setSources).catch(()=>{});
    localApi.listEvidenceTypes().then(setEvidenceTypes).catch(()=>{});
    localApi.listMistakeTypes().then(setMistakeTypes).catch(()=>{});
    localApi.listRules().then(setRules).catch(()=>{});
    localApi.runtimeReadiness().then(setRuntimeReadiness).catch(()=>{});
  },[]);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const sync=()=>setPrefersDark(media.matches);
    sync();
    media.addEventListener?.('change',sync);
    return ()=>media.removeEventListener?.('change',sync);
  },[]);

  async function refresh(){ try{setSessions(await localApi.listSessions());}catch(e){setMessage(String(e));} }
  async function refreshInstruments(){try{const v=await localApi.listInstruments();setInstruments(v);setInstrument(current=>v.some(x=>x.symbol===current)?current:(v[0]?.symbol??''));}catch(e){setMessage(String(e));}}
  async function refreshRequirements(){try{setRequirementOverrides(await localApi.getFieldRequirementOverrides());}catch(e){setMessage(String(e));}}
  async function saveAppearance(next:AppearancePreferences){
    try{
      const normalized=normalizeAppearance(next);
      setAppearance(normalized);
      await localApi.saveAppearancePreferences(normalized);
      setMessage('Appearance settings saved.');
    }catch(e){setMessage(String(e));}
  }
  function missingRequired(pairs:Array<[string,boolean]>):ValidationIssue[]{
    return pairs.filter(([id,present])=>isUserRequired(id,requirementOverrides)&&!present).map(([id])=>({id,label:FIELD_DEFINITION_BY_ID[id]?.label??id}));
  }
  function clearValidation(id:string){setValidationErrors(v=>v.filter(x=>x!==id));}
  function invalidClass(id:string){return validationErrors.includes(id)?'validationFieldError':'';}
  function jumpToRequiredField(id:string){
    const route=quickValidationRoute(id,active?.status==='DRAFT',!!plan);
    if(route.draftStep!==null)setDraftStep(route.draftStep);
    if(route.draftPlanPage!==null)setDraftPlanPage(route.draftPlanPage);
    if(route.draftZonePage!==null)setDraftZonePage(route.draftZonePage);
    if(route.notebookPage!==null)setNotebookPage(route.notebookPage);
    // Custom fields follow the canonical owner rather than a generic field name.
    if(id.startsWith('custom-required-')){
      if(id.startsWith('custom-required-candidate-')||id.startsWith('custom-required-zone-'))setNotebookPage('PLAN');
      if(id.startsWith('custom-required-trade-')||id.startsWith('custom-required-post-trade-review-'))setNotebookPage('EXECUTION');
      if(id.startsWith('custom-required-premarket-plan-')){
        if(active?.status==='DRAFT')setDraftStep(1);
        else setNotebookPage('PLAN');
      }
    }
    const focusVisible=(attempt:number)=>{
      const candidates=[
        ...Array.from(document.querySelectorAll<HTMLElement>('[data-validation-id]')).filter(el=>el.dataset.validationId===id),
        ...Array.from(document.querySelectorAll<HTMLElement>('[id]')).filter(el=>el.id===id)
      ];
      for(const el of candidates){
        const disclosure=el.closest('details');
        if(disclosure&&!disclosure.open)disclosure.open=true;
      }
      const target=candidates.find(el=>el.getClientRects().length>0);
      if(!target){if(attempt<12)window.setTimeout(()=>focusVisible(attempt+1),90);return;}
      target.scrollIntoView({behavior:'smooth',block:'center'});
      const input=target.matches('input,select,textarea,button')?target:
        target.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)');
      input?.focus({preventScroll:true});
    };
    window.setTimeout(()=>focusVisible(0),90);
  }
  function blockMissing(issues:ValidationIssue[]){
    if(!issues.length){setValidationErrors([]);return false;}
    const unique=issues.filter((issue,index,all)=>all.findIndex(x=>x.id===issue.id)===index);
    setValidationErrors(unique.map(x=>x.id));
    setValidationIssueLabels(v=>({...v,...Object.fromEntries(unique.map(x=>[x.id,x.label]))}));
    setMessage(`Missing required field${unique.length>1?'s':''}: ${unique.map(x=>x.label).join(', ')}.`);
    jumpToRequiredField(unique[0].id);
    return true;
  }
  async function refreshSafety(){try{setRuntimeReadiness(await localApi.runtimeReadiness());}catch(e){setMessage(String(e));}}
  async function runBetaSelfTest(){
    try{
      setBetaSelfTestBusy(true);setBetaSelfTest(null);
      const r=await localApi.runBetaSelfTest();
      setBetaSelfTest(r);setMessage(r.passed?'Beta self-test passed.':'Beta self-test needs attention.');
    }catch(e){setMessage(String(e));setBetaSelfTest({passed:false,ran_at:new Date().toISOString(),schema_version:runtimeReadiness?.schema_version??0,steps:[String(e)],temporary_path:''});}
    finally{setBetaSelfTestBusy(false);}
  }
  async function refreshAnalytics(filter:JournalFilter=journalFilter){
    try{
      const [rows,summary,mistakes]=await Promise.all([localApi.listJournalTrades(filter),localApi.getAnalyticsSummary(filter),localApi.listMistakeSummary(filter)]);
      setJournalRows(rows);setAnalytics(summary);setMistakeSummary(mistakes);
    }catch(e){setMessage(String(e));}
  }
  async function openAnalysis(){setShowSafety(false);setShowSettings(false);setShowAnalysis(true);window.scrollTo(0,0);await refreshAnalytics();}
  function patchJournalFilter(p:Partial<JournalFilter>){setJournalFilter(v=>({...v,...p}));}
  async function loadActive(s:SessionSummary){
    setShowDraftSetup(false);setValidationErrors([]);
    if(draftDirty && active?.status==='DRAFT' && active.session_id!==s.session_id && !window.confirm('Current draft has unsaved changes. Switch sessions?'))return;
    if(active?.session_id!==s.session_id){
      if(decisionCandidate&&(decisionReason.trim()||decisionNote.trim()||decisionQuality||mismatchReason.trim())&&!window.confirm('Unsaved decision details will be lost. Switch sessions?'))return;
      setNotebookPage('PLAN');setNotebookMaxPage(0);setDecisionCandidate(null);setQuickZoneId('');setPendingTradeDecision(null);setActiveTrade(null);setCandidateDecisions({});setEntryCommissionInput('');setEntryFeesInput('');setFillCommissionInput('');setFillFeesInput('');
    }
    setReviewQueue(null);setActive(s);rememberOpenedSession(s.session_id);
    if(s.status==='DRAFT'){
      setPlan(null);setTimeline([]);setConsistency(null);setSessionTrades([]);
      resetSessionInputState();setDraftDirty(false);
      setDate(s.session_date);
      setInstrument(s.instrument_symbol);
      setEnvironment(s.environment as 'REAL'|'DEMO'|'FORWARD_TEST');
      try {
        const raw=await localApi.getInitialPlanDraft(s.session_id);
        if(raw) {
          const d=JSON.parse(raw) as {version:number;step:number;bias:typeof bias;mainScenario:string;altScenario:string;preSessionState:string;preSessionStateIntensity:number|null;candidates:CandidateDraftInput[]};
          if(d.version!==1||!Array.isArray(d.candidates)) throw new Error('Unsupported or corrupt draft');
          setBias(d.bias);setMainScenario(d.mainScenario??'');setAltScenario(d.altScenario??'');
          setPreSessionState(d.preSessionState??'');setPreSessionStateIntensity(d.preSessionStateIntensity??null);
          setCandidates(d.candidates);setDraftZonePage(0);setDraftPlanPage(0);setDraftStep(Number.isInteger(d.step)&&d.step>=1&&d.step<=3?d.step:1);
        } else setDraftStep(1);
      } catch(e) { setMessage('Could not restore draft fields: '+String(e)); }
      return;
    }
    try{
      const p=await localApi.getCurrentPlan(s.session_id); setPlan(p);
      setTimeline(await localApi.listPlanTimeline(s.session_id));
      setConsistency(await localApi.checkPlanConsistency(s.session_id));
      const restoredTrades=await localApi.listSessionTrades(s.session_id);
      setSessionTrades(restoredTrades);
      // Quick page access is a view state, not evidence that earlier steps were incomplete.
      // Allow return to recorded trades and review after a full application restart.
      if(restoredTrades.length>0)setNotebookMaxPage(v=>Math.max(v,4));
      // Restore persisted Decision history independently of the plan/trade load.
      // Do not infer whether an earlier TRADE decision has an execution:
      // that requires an explicit decision_id-to-trade association.
      try{
        const histories=await Promise.all(p.candidates.map(async c=>[c.candidate_id,await localApi.listCandidateDecisions(c.candidate_id)] as const));
        setCandidateDecisions(Object.fromEntries(histories));
        if(histories.some(([,rows])=>rows.length>0))setNotebookMaxPage(v=>Math.max(v,2));
      }catch(e){setCandidateDecisions({});setMessage('Session loaded, but Decision history could not refresh: '+String(e));}
    }catch(e){
      setPlan(null);setTimeline([]);setConsistency(null);setSessionTrades([]);
      setMessage(`Could not load the confirmed plan for this ${s.status.toLowerCase()} session: ${String(e)}`);
    }
  }
  async function refreshPlan(){
    if(!active)return;
    const p=await localApi.getCurrentPlan(active.session_id); setPlan(p);
    setTimeline(await localApi.listPlanTimeline(active.session_id));
    setConsistency(await localApi.checkPlanConsistency(active.session_id));
    setSessionTrades(await localApi.listSessionTrades(active.session_id));
    await refresh();
  }
  async function start(){
    try{const s=await localApi.createDraftSession({session_date:date,instrument_symbol:instrument,environment}); setActive(s); rememberOpenedSession(s.session_id); setPlan(null); setDraftDirty(false); setDraftStep(1); setMessage('Draft session created. Build the initial plan, then confirm it.'); await refresh();}
    catch(e){setMessage(String(e));}
  }

  async function saveAndAdvanceDraft(nextStep:number){
    if(!active||active.status!=='DRAFT'||draftSaveInFlightRef.current)return;
    draftSaveInFlightRef.current=true;setDraftBusy(true);
    setDraftSaveFeedback('');
    try {
      await localApi.saveInitialPlanDraft(active.session_id,{
        version:1,step:nextStep,bias,mainScenario,altScenario,preSessionState,preSessionStateIntensity,candidates
      });
      setDraftStep(nextStep);setDraftDirty(false);
      setMessage('Draft saved to local database.');
      setDraftSaveFeedback('Draft saved successfully. You can safely continue; the initial plan is not yet confirmed.');
    }catch(e){setMessage('Draft not saved: '+String(e));setDraftSaveFeedback('Draft was NOT saved. Review the error in the header before retrying.');}
    finally{draftSaveInFlightRef.current=false;setDraftBusy(false);}
  }

  async function saveDraftSessionSetup(){
    if(!active||active.status!=='DRAFT'||draftSetupSavingRef.current)return;
    draftSetupSavingRef.current=true;setDraftSetupSaving(true);setDraftSetupFeedback('Saving session settings…');
    try{
      const saved=await localApi.updateDraftSession({session_id:active.session_id,session_date:date,instrument_symbol:instrument,environment});
      setActive(saved);setShowDraftSetup(false);setDraftStep(1);setMessage('Draft session setup updated.');
      setDraftSetupFeedback('Session settings saved.');
      try{await refresh();}catch(e){setMessage('Settings saved, but list refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setDraftSetupFeedback('Save not confirmed. Inspect session settings before retrying.');}
    finally{draftSetupSavingRef.current=false;setDraftSetupSaving(false);}
  }

  function beginEditDraftSetup(){
    if(!active||active.status!=='DRAFT')return;
    setDate(active.session_date);
    setInstrument(active.instrument_symbol);
    setEnvironment(active.environment as 'REAL'|'DEMO'|'FORWARD_TEST');
    setShowDraftSetup(true);
  }

  function resetSessionInputState(){
    setDate(sydneyToday());
    setBias('MIXED');
    setMainScenario('');
    setAltScenario('');
    setPreSessionState('');
    setPreSessionStateIntensity(null);
    setCandidates([emptyCandidate()]);

    setShowPlanUpdate(false);
    setNewBias('');
    setPlanReason('');
    setPlanEvidence('');
    setEditing(null);
    setEditIntent('LONG');
    setEditFrom(null);
    setEditTo(null);
    setEditSingle(null);
    setEditReason('');
    setEditSourceIds([]);

    setShowLiveCandidate(false);
    setLiveCandidate(emptyCandidate('DURING_SESSION'));
    setLiveCandidateReason('');
    setLiveCandidateEvidence('');

    setEvidenceCandidate(null);
    
    setEvidenceDirection('');
    setEvidencePrice(null);
    setEvidenceNote('');
    setCandidateEvidence({});

    setDecisionCandidate(null);
    setDecisionType('TRADE');
    setDecisionDirection('LONG');
    setDecisionReason('');
    setDecisionNote('');
    setDecisionQuality('');
    setMismatchReason('');
    setCandidateDecisions({});
    setPendingTradeDecision(null);

    setEntryPrice(null);
    setStopPrice(null);
    setTradeQty(1);
    setPlannedTarget(null);
    setEntryCommissionInput('');setEntryFeesInput('');
    setActiveTrade(null);
    setSessionTrades([]);
    setFillAction('EXIT');
    setFillPrice(null);
    setFillQty(1);
    setFillReason('');
    setFillCommissionInput('');setFillFeesInput('');
    setNewStop(null);
    setStopReason('');

    reviewSelectionRequestRef.current++;
    setReviewVerifiedTradeId(null);
    setReviewOwnerTradeId(null);setReviewFeedback('');
    setTradeReview(null);
    setReviewDecisionQuality('');
    setReviewExecutionQuality('');
    setReviewManagementQuality('');
    setReviewExitReason('');
    setReviewExitNote('');
    setEmotionAffected(null);
    setPsychState('');
    setPsychIntensity(null);
    setPsychStage('');
    setReviewMistakes([]);
    setReviewNote('');
    setTradeRuleCheck(null);
    setRuleViolationReported(null);
    setViolatedRuleIds([]);
    setRuleNote('');

    setShowSessionReview(false);
    setSessionReviewSummary(null);
    setSessionReview(null);
    setSrWentWell('');
    setSrWentPoorly('');
    setSrBestDecision('');
    setSrBiggestMistake('');
    setSrMarketLearning('');
    setSrNextImprovement('');
    setSrOverall('');
    setSrPlanQuality('');
    setSrDiscipline('');

    setValidationErrors([]);
  }

  function newSession(){
    setShowAnalysis(false);setShowSafety(false);setShowSettings(false);setShowDraftSetup(false);
    if(draftDirty && !window.confirm('Current draft has unsaved changes. Leave without saving?'))return;
    setActive(null);setPlan(null);setTimeline([]);setConsistency(null);
    resetSessionInputState();setDraftDirty(false);setDraftStep(1);
    setMessage('Ready to start a new session.');
  }

  function patchCandidate(i:number,patch:Partial<CandidateDraftInput>){setDraftDirty(true);setCandidates(v=>v.map((c,n)=>n===i?{...c,...patch}:c));}
  function toggleSource(i:number,sourceId:string){setDraftDirty(true);setCandidates(v=>v.map((c,n)=>{if(n!==i)return c; const has=c.sources.some(s=>s.source_type_id===sourceId); return {...c,sources:has?c.sources.filter(s=>s.source_type_id!==sourceId):[...c.sources,{source_type_id:sourceId}]};}));}
  function toggleLiveSource(sourceId:string){setLiveCandidate(c=>{const has=c.sources.some(s=>s.source_type_id===sourceId);return {...c,sources:has?c.sources.filter(s=>s.source_type_id!==sourceId):[...c.sources,{source_type_id:sourceId}]};});}

  async function confirm(){
    if(!active||active.status!=='DRAFT'){setMessage('Initial plan can only be confirmed for a draft session.');return;}
    if(confirmingPlanRef.current)return;
    confirmingPlanRef.current=true;setConfirmingPlan(true);
    try {
    // Drafts remain freely editable. Only confirmed plans require persisted custom Session values.
    try{
      const [sessionMissing,planMissing]=await Promise.all([
        missingRequiredCustomValues(localApi,'session',active.session_id),
        missingRequiredCustomValues(localApi,'premarket-plan',active.session_id),
      ]);
      if(sessionMissing.length||planMissing.length){
        setValidationErrors([...sessionMissing.map(x=>customFieldFocusId('session',active.session_id,x.fieldId)),...planMissing.map(x=>customFieldFocusId('premarket-plan',active.session_id,x.fieldId))]);
        setValidationIssueLabels(v=>({...v,...Object.fromEntries([...sessionMissing.map(x=>[customFieldFocusId('session',active.session_id,x.fieldId),x.label]),...planMissing.map(x=>[customFieldFocusId('premarket-plan',active.session_id,x.fieldId),x.label])])}));
        const first=sessionMissing[0]??planMissing[0];
        const stage=sessionMissing.length?'session':'premarket-plan';
        setMessage('Save required custom fields before confirming: '+[
          ...sessionMissing.map(x=>'Session: '+x.label),
          ...planMissing.map(x=>'Pre-market plan: '+x.label),
        ].join(', ')+'.');
        window.setTimeout(()=>focusRequiredCustomField(first.fieldId,stage,active.session_id),120);
        return;
      }
    }catch(e){setMessage('Plan not confirmed: could not verify required Session custom fields. '+String(e));return;}
    const configuredLabel=(id:string,fallback:string)=>fieldText[id]?.label?.trim()||fallback;
    const missing=missingRequired([
      ['plan.mainScenario',!!mainScenario.trim()],
      ['plan.alternativeScenario',!!altScenario.trim()],
      ['plan.preSessionState',!!preSessionState.trim()],
      ['plan.preSessionStateIntensity',preSessionStateIntensity!=null],
    ]).map(issue=>({...issue,label:configuredLabel(issue.id,issue.label)}));
    candidates.forEach((candidate,index)=>{
      const suffix=candidates.length>1?` (zone ${index+1})`:'';
      if(isUserRequired('candidate.sources',requirementOverrides)&&candidate.sources.length===0)missing.push({id:`candidate-${index}.sources`,label:configuredLabel('candidate.sources','Level source')+suffix});
      if(isUserRequired('candidate.requiredConditions',requirementOverrides)&&cleanLines(candidate.required_conditions).length===0)missing.push({id:`candidate-${index}.requiredConditions`,label:configuredLabel('candidate.requiredConditions','Need to see')+suffix});
      if(isUserRequired('candidate.invalidationConditions',requirementOverrides)&&cleanLines(candidate.invalidation_conditions).length===0)missing.push({id:`candidate-${index}.invalidationConditions`,label:configuredLabel('candidate.invalidationConditions','Abandon if')+suffix});
      if(candidate.price_mode==='RANGE'){if(candidate.price_from==null||!Number.isFinite(candidate.price_from))missing.push({id:`candidate-${index}.priceFrom`,label:`Valid range from${suffix}`});if(candidate.price_to==null||!Number.isFinite(candidate.price_to))missing.push({id:`candidate-${index}.priceTo`,label:`Valid range to${suffix}`});}
      if(candidate.price_mode==='SINGLE'&&(candidate.reference_price==null||!Number.isFinite(candidate.reference_price)))missing.push({id:`candidate-${index}.price`,label:`Valid price${suffix}`});
    });
    if(missing.length){
      // Render the missing fields before scrolling to them; hidden steps cannot be focused.
      const first=missing[0];
      if(first.id.startsWith('candidate-')){
        const zoneIndex=Number(first.id.match(/^candidate-(\d+)/)?.[1]??0);
        setDraftStep(2);setDraftZonePage(Number.isFinite(zoneIndex)?zoneIndex:0);
      }else{
        setDraftStep(1);setDraftPlanPage(first.id==='plan.mainScenario'||first.id==='plan.alternativeScenario'?1:0);
      }
      blockMissing(missing);
      return;
    }
    const badZone=candidates.findIndex(c=>c.price_mode==='RANGE'&&c.price_from!=null&&c.price_to!=null&&c.price_from>c.price_to);
    if(badZone>=0){const c=candidates[badZone];setDraftStep(2);setDraftZonePage(badZone);setValidationErrors([`candidate-${badZone}.priceFrom`,`candidate-${badZone}.priceTo`]);setMessage(`Zone ${badZone+1} (${c.label||'Unnamed'}): From ${c.price_from} exceeds To ${c.price_to}. Correct the highlighted range before confirming.`);window.setTimeout(()=>{const node=document.querySelector<HTMLElement>(`[data-validation-id="candidate-${badZone}.priceFrom"]`);node?.scrollIntoView({behavior:'smooth',block:'center'});node?.querySelector<HTMLElement>('input')?.focus({preventScroll:true});},120);return;}
    setValidationErrors([]);
    try{
      await localApi.confirmInitialPlan({session_id:active.session_id,initial_bias:bias,main_scenario:mainScenario||null,alternative_scenario:altScenario||null,expected_context:[],things_not_to_do:[],pre_session_state:preSessionState||null,pre_session_state_intensity:preSessionStateIntensity,candidates:candidates.map(cleanCandidate)});
      setMessage('Initial plan confirmed and locked into immutable history.'); await refreshPlan();
    }catch(e){setMessage(String(e));}
    } finally {
      confirmingPlanRef.current=false;setConfirmingPlan(false);
    }
  }

  async function savePlanUpdate(){
    if(!active||!plan||planRevisionSavingRef.current)return;
    const issues:ValidationIssue[]=[...(!planReason.trim()?[{id:'planRevision.reason',label:'Reason for changing the plan'}]:[]),...planRevisionEvidenceIssues(requirementOverrides,planEvidence)];
    if(blockMissing(issues)){setPlanRevisionFeedback('Complete all highlighted required revision fields.');return;}
    planRevisionSavingRef.current=true;setPlanRevisionSaving(true);setPlanRevisionFeedback('Saving revision…');
    try{
      await localApi.createPlanRevision({session_id:active.session_id,initial_bias:newBias||null,why_changed:planReason,change_type:'MARKET_VIEW_UPDATE',new_evidence_summary:planEvidence||null});
      setShowPlanUpdate(false); setPlanReason('');setPlanEvidence('');setNewBias('');
      setMessage('New plan revision saved. Original plan remains unchanged.');setPlanRevisionFeedback('Revision saved.');
      try{await refreshPlan();}catch(e){setMessage('Revision saved, but plan history refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setPlanRevisionFeedback('Revision save not confirmed. Inspect plan history before retrying.');}
    finally{planRevisionSavingRef.current=false;setPlanRevisionSaving(false);}
  }

  function beginCandidateEdit(c:CurrentCandidate){setEditing(c);setEditIntent(c.directional_intent);setEditFrom(c.price_from??null);setEditTo(c.price_to??null);setEditSingle(c.reference_price??null);setEditReason('');setEditSourceIds(c.source_type_ids);}
  function toggleEditSource(id:string){setEditSourceIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
  async function saveCandidateRevision(){
    if(!editing||zoneRevisionSavingRef.current)return;
    if(blockMissing(!editReason.trim()?[{id:'zoneRevision.reason',label:'Reason for revision'}]:[])){setZoneRevisionFeedback('Complete highlighted required fields.');return;}
    zoneRevisionSavingRef.current=true;setZoneRevisionSaving(true);setZoneRevisionFeedback('Saving zone revision…');
    try{
      await localApi.reviseCandidate({candidate_id:editing.candidate_id,directional_intent:editIntent,trend_relationship:editing.trend_relationship??null,price_mode:editing.price_mode,price_from:editFrom,price_to:editTo,reference_price:editSingle,required_conditions:editing.required_conditions,invalidation_conditions:editing.invalidation_conditions,notes:editing.notes??null,change_type:'UPDATE',change_reason:editReason,sources:editSourceIds.map(source_type_id=>({source_type_id}))});
      setEditing(null);setMessage('Zone revision saved without overwriting the original.');setZoneRevisionFeedback('Zone revision saved.');
      try{await refreshPlan();}catch(e){setMessage('Revision saved, but plan refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setZoneRevisionFeedback('Revision not confirmed. Inspect zone history before retrying.');}
    finally{zoneRevisionSavingRef.current=false;setZoneRevisionSaving(false);}
  }

  async function setStatus(c:CurrentCandidate,status:string){
    if(zoneStatusSavingRef.current)return;
    let reason:string|null=null;
    if(['INVALIDATED','CANCELLED','EXPIRED'].includes(status))reason=window.prompt('Reason (optional)')||null;
    zoneStatusSavingRef.current=true;setZoneStatusSavingId(c.candidate_id);setZoneStatusFeedbackId(c.candidate_id);setZoneStatusFeedback('Saving zone status…');
    try{
      await localApi.addCandidateStatus(c.candidate_id,status,reason);
      setMessage(`${c.label||'Zone'} → ${status}`);setZoneStatusFeedback('Zone status saved: '+status+'.');
      try{await refreshPlan();}catch(e){setMessage('Status saved, but plan refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setZoneStatusFeedback('Status not confirmed. Inspect zone timeline before retrying.');}
    finally{zoneStatusSavingRef.current=false;setZoneStatusSavingId(null);}
  }

  async function addLiveZone(){
    if(!active||liveZoneSavingRef.current)return;
    const missingLiveZone:ValidationIssue[]=[
      ...(!liveCandidateReason.trim()?[{id:'liveZone.reason',label:'Reason for adding this zone'}]:[]),
      ...planRevisionEvidenceIssues(requirementOverrides,liveCandidateEvidence),
    ];
    if(blockMissing(missingLiveZone)){setLiveZoneFeedback('Complete all highlighted required fields.');return;}
    liveZoneSavingRef.current=true;setLiveZoneSaving(true);setLiveZoneFeedback('Adding new zone…');
    try{
      await localApi.addLiveCandidate({session_id:active.session_id,why_changed:liveCandidateReason,new_evidence_summary:liveCandidateEvidence||null,candidate:cleanCandidate(liveCandidate)});
      setLiveCandidate(emptyCandidate('DURING_SESSION'));setLiveCandidateReason('');setLiveCandidateEvidence('');setShowLiveCandidate(false);
      setMessage('New live zone added through a new immutable plan revision.');setLiveZoneFeedback('New zone saved.');
      try{await refreshPlan();}catch(e){setMessage('Zone saved, but plan refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setLiveZoneFeedback('Zone not confirmed. Inspect plan timeline before retrying.');}
    finally{liveZoneSavingRef.current=false;setLiveZoneSaving(false);}
  }

  async function openEvidence(c:CurrentCandidate){
    setNotebookPage('EVIDENCE');setNotebookMaxPage(v=>Math.max(v,1));setEvidenceCandidate(c);setValidationErrors([]);setSelectedEvidenceIds([]);setEvidenceStances({});setSavedEvidenceIds([]);setEvidenceSaved(false);setEvidenceFeedback(''); setEvidencePrice(null); setEvidenceNote(''); setEvidenceDirection(''); 
    try{
      const rows = await localApi.listCandidateEvidence(c.candidate_id);
      setCandidateEvidence(v=>({...v,[c.candidate_id]:rows}));
    }catch{}
  }
  async function saveEvidence(){
    if(!active||!evidenceCandidate||evidenceSavingRef.current||evidenceSaved)return;
    if(blockMissing([...(selectedEvidenceIds.length?[]:[{id:'evidence.selection',label:'Observed evidence type'}]),...evidenceRequiredIssues(requirementOverrides,evidencePrice,evidenceNote,evidenceDirection)])){setEvidenceFeedback('Complete the highlighted evidence fields before capture.');return;}
    evidenceSavingRef.current=true;setEvidenceSaving(true);setEvidenceFeedback('');
    try {
      const inputs=selectedEvidenceIds.map(id=>({
        session_id:active.session_id,candidate_id:evidenceCandidate.candidate_id,
        evidence_type_id:id,role:evidenceStances[id]??'GENERAL_OBSERVATION',
        direction:evidenceDirection||'NEUTRAL',price:evidencePrice,note:evidenceNote||null
      }));
      await localApi.addEvidenceObservationsAtomic(inputs);
      setEvidenceSaved(true);
      setSavedEvidenceIds([...selectedEvidenceIds]);
      setEvidenceFeedback(inputs.length+' observations saved together. The captured values remain visible, read-only, until you choose Record another.');
      try{
        const rows=await localApi.listCandidateEvidence(evidenceCandidate.candidate_id);
        setCandidateEvidence(v=>({...v,[evidenceCandidate.candidate_id]:rows}));
        setTimeline(await localApi.listPlanTimeline(active.session_id));
      }catch(e){setMessage('Evidence saved, but history refresh failed: '+String(e));}
    }catch(e){setEvidenceFeedback('Nothing saved in this batch: '+String(e));}
    finally{evidenceSavingRef.current=false;setEvidenceSaving(false);}
  }


  async function openDecision(c:CurrentCandidate,type:'TRADE'|'NO_TRADE'|'MISSED'='TRADE'){
    if(decisionSavingRef.current)return;
    setDecisionSaveFeedback('');setLastDecisionNotice('');setNotebookPage('DECISION');setNotebookMaxPage(v=>Math.max(v,2));setQuickZoneId(c.candidate_id);setDecisionCandidate(c); setDecisionType(type); setDecisionReason(''); setDecisionNote(''); setDecisionQuality(''); setMismatchReason('');
    if(c.directional_intent==='LONG'||c.directional_intent==='SHORT') setDecisionDirection(c.directional_intent);
    try{const rows=await localApi.listCandidateDecisions(c.candidate_id);setCandidateDecisions(v=>({...v,[c.candidate_id]:rows}));}catch{}
  }
  async function saveDecision(){
    if(!active||!decisionCandidate||decisionSavingRef.current)return;
    const isTrade=decisionType==='TRADE';
    const decisionMissing:ValidationIssue[]=[];
    if(!isTrade&&!decisionReason.trim()&&!decisionNote.trim())decisionMissing.push({id:'decision.reason',label:'Decision reason'});
    if(isUserRequired('decision.quality',requirementOverrides)&&!decisionQuality)decisionMissing.push({id:'decision.quality',label:'Decision quality'});
    if(isUserRequired('decision.note',requirementOverrides)&&!decisionNote.trim())decisionMissing.push({id:'decision.note',label:'Decision note'});
    const opposite=isTrade && ['LONG','SHORT'].includes(decisionCandidate.directional_intent) && decisionDirection!==decisionCandidate.directional_intent;
    if(opposite&&!mismatchReason.trim())decisionMissing.push({id:'decision.mismatchReason',label:'Reason for trading opposite to the Zone plan'});
    if(blockMissing(decisionMissing))return;
    // Lock before the awaited custom-field read to prevent duplicate decisions on rapid clicks.
    decisionSavingRef.current=true;setDecisionSaving(true);setDecisionSaveFeedback('');setLastDecisionNotice('');
    // A Zone may be revisited repeatedly. Check its persisted required custom answers before EACH decision.
    try{
      const [candidateMissing,zoneMissing]=await Promise.all([
        missingRequiredCustomValues(localApi,'candidate',decisionCandidate.candidate_id),
        missingRequiredCustomValues(localApi,'zone',decisionCandidate.candidate_id),
      ]);
      if(candidateMissing.length||zoneMissing.length){
        setValidationErrors([...candidateMissing.map(x=>customFieldFocusId('candidate',decisionCandidate.candidate_id,x.fieldId)),...zoneMissing.map(x=>customFieldFocusId('zone',decisionCandidate.candidate_id,x.fieldId))]);
        setValidationIssueLabels(v=>({...v,...Object.fromEntries([...candidateMissing.map(x=>[customFieldFocusId('candidate',decisionCandidate.candidate_id,x.fieldId),x.label]),...zoneMissing.map(x=>[customFieldFocusId('zone',decisionCandidate.candidate_id,x.fieldId),x.label])])}));
        const first=candidateMissing[0]??zoneMissing[0];
        const firstStage:CustomFieldOwnerStage=candidateMissing.length?'candidate':'zone';
        setMessage('Save required Candidate/Zone custom fields before recording a decision: '+[
          ...candidateMissing.map(x=>'Candidate: '+x.label),
          ...zoneMissing.map(x=>'Zone: '+x.label),
        ].join(', ')+'.');
        setNotebookPage('PLAN');
        setQuickZoneId(decisionCandidate.candidate_id);
        window.setTimeout(()=>focusRequiredCustomField(first.fieldId,firstStage,decisionCandidate.candidate_id),120);
        decisionSavingRef.current=false;setDecisionSaving(false);
        return;
      }
    }catch(e){
      setMessage('Decision not saved: could not verify required Zone custom fields. '+String(e));
      decisionSavingRef.current=false;setDecisionSaving(false);
      return;
    }
    try{
      const saved=await localApi.createCandidateDecision({session_id:active.session_id,candidate_id:decisionCandidate.candidate_id,decision_type:decisionType,intended_direction:isTrade?decisionDirection:null,reason_code:decisionReason||null,reason_note:decisionNote||null,decision_quality:decisionQuality||null,decision_quality_note:null,plan_mismatch_reason:opposite?(mismatchReason||null):null});
      // Once the backend acknowledges a decision, do not report a later history-refresh
      // failure as a failed save: retrying could create a duplicate decision.
      try {
        const rows=await localApi.listCandidateDecisions(decisionCandidate.candidate_id);
        setCandidateDecisions(v=>({...v,[decisionCandidate.candidate_id]:rows}));
      } catch (refreshError) {
        setCandidateDecisions(v=>({...v,[decisionCandidate.candidate_id]:[saved,...(v[decisionCandidate.candidate_id]??[]).filter(d=>d.decision_id!==saved.decision_id)]}));
        setMessage('Decision saved, but decision history could not refresh: '+String(refreshError));
      }
      try { setTimeline(await localApi.listPlanTimeline(active.session_id)); }
      catch (refreshError) { setMessage('Decision saved, but timeline could not refresh: '+String(refreshError)); }
      if(isTrade){ setNotebookPage('EXECUTION'); setPendingTradeDecision(saved); setEntryPrice(null); setStopPrice(null); setTradeQty(1); setPlannedTarget(null); setEntryCommissionInput('');setEntryFeesInput(''); setMessage('Trade decision saved. Record only entry, stop and quantity now.'); window.requestAnimationFrame(()=>document.getElementById('journal-quick-entry')?.scrollIntoView({behavior:'smooth',block:'start'})); }
      else {const notice=`${decisionType.replace('_','-')} saved for this Zone. You can record another decision if the Zone is revisited.`;setMessage(notice);setLastDecisionNotice(notice);}
      setDecisionCandidate(null);
    }catch(e){setDecisionSaveFeedback('Decision not saved: '+String(e));}
    finally{decisionSavingRef.current=false;setDecisionSaving(false);}
  }


  async function createExecutedTrade(){
    if(!pendingTradeDecision||tradeOpeningRef.current)return;
    const entryCommission=parseOptionalFillCost(entryCommissionInput);
    const entryFees=parseOptionalFillCost(entryFeesInput);
    const preflight=previewEntryRisk({entry:entryPrice,stop:stopPrice,quantity:tradeQty,
      tickSize:active?.instrument_tick_size??NaN,pointValue:active?.instrument_point_value??NaN,
      direction:pendingTradeDecision.intended_direction,target:plannedTarget});
    const missing:ValidationIssue[]=[
      ...tradeEntryIssues(entryPrice,stopPrice,tradeQty,plannedTarget,isUserRequired('trade.plannedTarget',requirementOverrides)),
      ...preflight.problems,
      ...(!entryCommission.valid?[{id:'trade.entryCommission',label:'Entry commission (non-negative total)'}]:[]),
      ...(!entryFees.valid?[{id:'trade.entryFees',label:'Entry fees (non-negative total)'}]:[]),
    ];
    if(blockMissing(missing)){setTradeOpeningFeedback('Complete the highlighted trade-entry fields.');return;}
    if(entryPrice==null||stopPrice==null||!entryCommission.valid||!entryFees.valid)return;
    tradeOpeningRef.current=true;setTradeOpening(true);setTradeOpeningFeedback('Recording entry and initial risk…');
    try{
      const detail=await localApi.createTradeWithEntry({decision_id:pendingTradeDecision.decision_id,entry_price:entryPrice,stop_price:stopPrice,quantity:tradeQty,order_type:'MARKET',planned_target_price:plannedTarget,commission:entryCommission.value,fees:entryFees.value});
      reviewSelectionRequestRef.current++;
      setActiveTrade(detail);applyReview(null,detail.metrics.trade_id);setReviewVerifiedTradeId(detail.metrics.trade_id);setReviewFeedback('');
      setPendingTradeDecision(null);setReviewQueue(null);setEntryCommissionInput('');setEntryFeesInput('');
      setMessage('Trade opened. Entry and initial risk are recorded with timestamps.');setTradeOpeningFeedback('Entry and initial risk saved.');
      if(active)try{setSessionTrades(await localApi.listSessionTrades(active.session_id));}
      catch(e){setMessage('Trade created, but trade list refresh failed: '+String(e));}
    }catch(e){setMessage('Trade creation was not confirmed. Check existing session trades before retrying: '+String(e));setTradeOpeningFeedback('Trade opening not confirmed. Inspect executions before retrying.');}
    finally{tradeOpeningRef.current=false;setTradeOpening(false);}
  }
  async function addFill(){
    if(fillSavingRef.current||!activeTrade)return;
    const fillCommission=parseOptionalFillCost(fillCommissionInput);
    const fillFees=parseOptionalFillCost(fillFeesInput);
    const fillIssues:ValidationIssue[]=[
      ...([{id:'fill.price',label:'Fill price',missing:fillPrice===null||!Number.isFinite(fillPrice)},
           {id:'fill.quantity',label:'Valid fill quantity (cannot exit more than open)',missing:!Number.isInteger(fillQty)||fillQty<=0||(fillAction==='EXIT'&&fillQty>activeTrade.metrics.open_quantity)}]
          .filter(x=>x.missing).map(x=>({id:x.id,label:x.label}))),
      ...missingRequired([['fill.reason',!!fillReason.trim()]]),
      ...(!fillCommission.valid?[{id:'fill.commission',label:'Fill commission (non-negative total)'}]:[]),
      ...(!fillFees.valid?[{id:'fill.fees',label:'Fill fees (non-negative total)'}]:[]),
    ];
    if(blockMissing(fillIssues)){setFillFeedback('Complete the highlighted required fill fields.');return;}
    if(!fillCommission.valid||!fillFees.valid)return;
    fillSavingRef.current=true;setFillSaving(true);setFillFeedback('');
    try{
      const detail=await localApi.addTradeFill({trade_id:activeTrade.metrics.trade_id,action:fillAction,price:fillPrice!,quantity:fillQty,order_type:'MARKET',commission:fillCommission.value,fees:fillFees.value,note:fillReason||null});
      setActiveTrade(detail);setReviewQueue(null);setFillPrice(null);setFillQty(1);setFillReason('');setFillCommissionInput('');setFillFeesInput('');
      const request=++reviewSelectionRequestRef.current;
      applyReview(null,detail.metrics.trade_id);setReviewVerifiedTradeId(null);setReviewFeedback('');
      if(detail.metrics.status==='CLOSED'){
        try{const review=await localApi.getTradeReview(detail.metrics.trade_id);
          if(reviewSelectionRequestRef.current===request){applyReview(review,detail.metrics.trade_id);setReviewVerifiedTradeId(detail.metrics.trade_id);}
        }catch(e){if(reviewSelectionRequestRef.current===request)setReviewFeedback('Review status could not be refreshed. Reopen trade before completing. '+String(e));}
      }else if(reviewSelectionRequestRef.current===request){setReviewVerifiedTradeId(detail.metrics.trade_id);}
      const success=fillAction==='EXIT'?'Exit fill recorded.':'Additional entry fill recorded.';
      setMessage(success);setFillFeedback(success);
      if(active)try{setSessionTrades(await localApi.listSessionTrades(active.session_id));}
      catch(e){setMessage('Fill recorded, but trade list refresh failed: '+String(e));}
    }catch(e){setMessage('Fill confirmation failed; check existing executions before retrying: '+String(e));setFillFeedback('Fill confirmation uncertain. Check execution timeline before retrying.');}
    finally{fillSavingRef.current=false;setFillSaving(false);}
  }
  async function moveStop(){
    if(stopSavingRef.current||!activeTrade)return;
    if(blockMissing([...(newStop===null||!Number.isFinite(newStop)?[{id:'management.stop',label:'New stop price'}]:[]),...missingRequired([['management.reason',!!stopReason.trim()]])])){setStopFeedback('Complete the highlighted required stop fields.');return;}
    stopSavingRef.current=true;setStopSaving(true);setStopFeedback('Saving stop change…');
    try{
      const detail=await localApi.moveTradeStop({trade_id:activeTrade.metrics.trade_id,stop_price:newStop!,reason:stopReason||null});
      setActiveTrade(detail);setNewStop(null);setStopReason('');
      setMessage('Stop change saved as a new immutable risk snapshot.');
      setStopFeedback('Stop change saved.');
      if(active)try{setSessionTrades(await localApi.listSessionTrades(active.session_id));}
      catch(e){setMessage('Stop saved, but trade list refresh failed: '+String(e));}
    }catch(e){setMessage(String(e));setStopFeedback('Stop change not confirmed. Inspect risk history before retrying.');}
    finally{stopSavingRef.current=false;setStopSaving(false);}
  }
  function applyReview(r:TradeReview|null,ownerId:string|null=activeTrade?.metrics.trade_id??null){
    setReviewOwnerTradeId(ownerId);
    setTradeReview(r);
    setReviewDecisionQuality((r?.decision_quality as any)||'');
    setReviewExecutionQuality((r?.execution_quality as any)||'');
    setReviewManagementQuality((r?.management_quality as any)||'');
    setReviewExitReason(r?.exit_reason_code||''); setReviewExitNote(r?.exit_reason_note||'');
    setEmotionAffected(r?.emotion_affected??null); setPsychState(r?.psychology_state||''); setPsychIntensity(r?.psychology_intensity??null);
    setPsychStage((r?.psychology_stage as any)||''); setReviewMistakes(r?.mistake_type_ids||[]); setReviewNote(r?.note||'');
  }
  function loadReviewPending(){setReviewQueueRefreshToken(v=>v+1);}
  function beginSameZoneReentry(t:TradeMetrics){
    if(!plan||!t.candidate_id||t.status!=='CLOSED')return;
    const zone=plan.candidates.find(c=>c.candidate_id===t.candidate_id);
    if(!zone){setMessage('The original Zone is not in the current plan. Check its history before a new decision.');return;}
    if(pendingTradeDecision){setMessage('A saved TRADE decision is awaiting execution. Finish or inspect it before creating another.');return;}
    reviewSelectionRequestRef.current++;
    setActiveTrade(null);applyReview(null,null);setReviewVerifiedTradeId(null);setReviewFeedback('');
    setQuickZoneId(zone.candidate_id);
    void openDecision(zone,'TRADE');
  }
  async function openTradeDetail(t:TradeMetrics){
    const request=++reviewSelectionRequestRef.current;
    setNotebookPage('EXECUTION');setNotebookMaxPage(v=>Math.max(v,3));
    setActiveTrade(null);applyReview(null,t.trade_id);setReviewVerifiedTradeId(null);setReviewFeedback('');
    try{
      const detail=await localApi.getTradeDetail(t.trade_id);
      if(reviewSelectionRequestRef.current!==request)return;
      setActiveTrade(detail);
      const [review,ruleCheck]=await Promise.all([localApi.getTradeReview(t.trade_id),localApi.getTradeRuleCheck(t.trade_id)]);
      if(reviewSelectionRequestRef.current!==request)return;
      applyReview(review,t.trade_id);setReviewVerifiedTradeId(t.trade_id);applyRuleCheck(ruleCheck);
    }catch(e){if(reviewSelectionRequestRef.current===request){setReviewFeedback('Review state could not be verified. Reopen trade before saving.');setMessage(String(e));}}
  }
  function toggleReviewMistake(id:string){setReviewMistakes(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}

  function applyRuleCheck(r:TradeRuleCheck|null){
    setTradeRuleCheck(r);
    setRuleViolationReported(r?.any_violation??null);
    setViolatedRuleIds(r?.violated_rule_version_ids||[]);
    setRuleNote(r?.note||'');
  }
  function toggleRuleViolation(id:string){setViolatedRuleIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
  function applySessionReview(r:SessionReview|null){
    setSessionReview(r); setSrWentWell(r?.what_went_well||''); setSrWentPoorly(r?.what_went_poorly||''); setSrBestDecision(r?.best_decision||'');
    setSrBiggestMistake(r?.biggest_mistake||''); setSrMarketLearning(r?.market_learning||''); setSrNextImprovement(r?.next_improvement||'');
    setSrOverall((r?.overall_assessment as any)||''); setSrPlanQuality((r?.plan_quality as any)||''); setSrDiscipline((r?.discipline as any)||'');
  }
  async function openSessionReview(){
    if(!active)return;
    try{setSessionReviewSummary(await localApi.getSessionReviewSummary(active.session_id));applySessionReview(await localApi.getSessionReview(active.session_id));setShowSessionReview(true);}catch(e){setMessage(String(e));}
  }
  async function saveSessionReview(finalize=false){
    if(!active||sessionReviewSavingRef.current)return;
    if(finalize && blockMissing(sessionReviewRequiredIssues(requirementOverrides,{
      'sessionReview.wentWell':srWentWell,
      'sessionReview.nextImprovement':srNextImprovement,
      'sessionReview.wentPoorly':srWentPoorly,
      'sessionReview.bestDecision':srBestDecision,
      'sessionReview.biggestMistake':srBiggestMistake,
      'sessionReview.marketLearning':srMarketLearning,
      'sessionReview.overall':srOverall,
      'sessionReview.planQuality':srPlanQuality,
      'sessionReview.discipline':srDiscipline,
    }))){setSessionReviewFeedback('Complete highlighted required fields before closing the session.');return;}
    sessionReviewSavingRef.current=true;setSessionReviewSaving(true);setSessionReviewFeedback(finalize?'Completing session review…':'Saving session review draft…');
    try{const r=await localApi.saveSessionReview({session_id:active.session_id,what_went_well:srWentWell||null,what_went_poorly:srWentPoorly||null,best_decision:srBestDecision||null,biggest_mistake:srBiggestMistake||null,market_learning:srMarketLearning||null,next_improvement:srNextImprovement||null,plan_quality:srPlanQuality||null,discipline:srDiscipline||null,overall_assessment:srOverall||null,finalize});applySessionReview(r);setSessionReviewFeedback(finalize?'Session review completed and locked.':'Session review draft saved.');setMessage(finalize?'Session review completed and session closed.':'Session review draft saved.');if(finalize){setActive(a=>a?{...a,status:'CLOSED'}:a);}try{await refresh();}catch(e){setMessage('Review saved, but session refresh failed: '+String(e));}}catch(e){setMessage(String(e));setSessionReviewFeedback('Session review save not confirmed. Inspect saved review before retrying.');}
    finally{sessionReviewSavingRef.current=false;setSessionReviewSaving(false);}
  }
  async function saveReview(finalize=false){
    if(!activeTrade||reviewSavingRef.current)return;
    if(reviewOwnerTradeId!==activeTrade.metrics.trade_id||reviewVerifiedTradeId!==activeTrade.metrics.trade_id){setReviewFeedback('Review status is not verified. Reopen this trade before saving.');return;}
    if(isCompletedReviewForTrade(tradeReview,reviewOwnerTradeId,activeTrade.metrics.trade_id)){setReviewFeedback('Review already completed and locked.');return;}
    const savingTradeId=activeTrade.metrics.trade_id;
    const reviewRequestAtStart=reviewSelectionRequestRef.current;
    reviewSavingRef.current=true;setReviewSaving(true);setReviewFeedback('Checking required fields…');
    try{
    const missing=reviewCompletionIssues(finalize,requirementOverrides,{
      decisionQuality:reviewDecisionQuality,
      executionQuality:reviewExecutionQuality,
      managementQuality:reviewManagementQuality,
      exitReason:reviewExitReason,
      exitNote:reviewExitNote,
      reviewNote,
      ruleNote,
      ruleViolationReported,
      emotionAffected,
      psychologyState:psychState,
      psychologyStage:psychStage,
      psychologyIntensity:psychIntensity,
    });
    if(blockMissing(missing)){setReviewFeedback('Complete highlighted required fields before saving.');return;}
    if(finalize){
      try{
        const [tradeMissing,reviewMissing]=await Promise.all([
          missingRequiredCustomValues(localApi,'trade',activeTrade.metrics.trade_id),
          missingRequiredCustomValues(localApi,'post-trade-review',activeTrade.metrics.trade_id),
        ]);
        if(tradeMissing.length||reviewMissing.length){
          setValidationErrors([...tradeMissing.map(x=>customFieldFocusId('trade',activeTrade.metrics.trade_id,x.fieldId)),...reviewMissing.map(x=>customFieldFocusId('post-trade-review',activeTrade.metrics.trade_id,x.fieldId))]);
          setValidationIssueLabels(v=>({...v,...Object.fromEntries([...tradeMissing.map(x=>[customFieldFocusId('trade',activeTrade.metrics.trade_id,x.fieldId),x.label]),...reviewMissing.map(x=>[customFieldFocusId('post-trade-review',activeTrade.metrics.trade_id,x.fieldId),x.label])])}));
          const first=tradeMissing[0]??reviewMissing[0];
          const firstStage:CustomFieldOwnerStage=tradeMissing.length?'trade':'post-trade-review';
          setMessage('Save required Trade/Review custom fields before completing: '+[
            ...tradeMissing.map(x=>'Trade: '+x.label),
            ...reviewMissing.map(x=>'Post-trade review: '+x.label),
          ].join(', ')+'.');
          setReviewFeedback('Save the named required custom fields before completing.');
          setNotebookPage('EXECUTION');
          window.setTimeout(()=>focusRequiredCustomField(first.fieldId,firstStage,activeTrade.metrics.trade_id),120);
          return;
        }
      }catch(e){setReviewFeedback('Required field check failed. Verify existing values before retrying.');setMessage('Review not completed: required custom fields could not be verified. '+String(e));return;}
    }
    setReviewFeedback(finalize?'Completing review…':'Saving draft…');
    try{
      if(ruleViolationReported!==null){
        const rc=await localApi.saveTradeRuleCheck({trade_id:activeTrade.metrics.trade_id,any_violation:ruleViolationReported,violated_rule_version_ids:ruleViolationReported?violatedRuleIds:[],note:ruleNote||null});
        applyRuleCheck(rc);
      }
      const r=await localApi.saveTradeReview({trade_id:activeTrade.metrics.trade_id,decision_quality:reviewDecisionQuality||null,execution_quality:reviewExecutionQuality||null,management_quality:reviewManagementQuality||null,exit_reason_code:reviewExitReason||null,exit_reason_note:reviewExitNote||null,emotion_affected:emotionAffected,psychology_state:emotionAffected?psychState||null:null,psychology_intensity:emotionAffected?psychIntensity:null,psychology_stage:emotionAffected?(psychStage||null):null,mistake_type_ids:reviewMistakes,note:reviewNote||null,finalize});
      if(reviewSelectionRequestRef.current===reviewRequestAtStart){applyReview(r,savingTradeId);setReviewQueueRefreshToken(v=>v+1);setReviewFeedback(finalize?'Review completed and locked.':'Review draft saved.');}
      setMessage(finalize?'Post-trade review completed and locked.':'Review draft saved.');
    }catch(e){setReviewFeedback('Save not confirmed. Check the review/event history before retrying.');setMessage(String(e));}
    }finally{reviewSavingRef.current=false;setReviewSaving(false);}
  }

  const tickStep=active?.instrument_tick_size??instruments.find(x=>x.symbol===instrument)?.tick_size??0.01;
  const entryRiskPreview=previewEntryRisk({entry:entryPrice,stop:stopPrice,quantity:tradeQty,
    tickSize:active?.instrument_tick_size??NaN,pointValue:active?.instrument_point_value??NaN,
    direction:pendingTradeDecision?.intended_direction,target:plannedTarget});

  const groupedSources=useMemo(()=>Object.entries(sources.reduce<Record<string,LevelSourceType[]>>((a,s)=>((a[s.source_group]??=[]).push(s),a),{})),[sources]);
  const groupedEvidence=useMemo(()=>Object.entries(evidenceTypes.reduce<Record<string,EvidenceType[]>>((a,s)=>((a[s.family]??=[]).push(s),a),{})),[evidenceTypes]);
  const timeLabel=(iso:string)=>{try{return new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
  const activeCandidates=plan?.candidates.filter(c=>ACTIVE_STATES.has(c.current_status))??[];
  const longZones=activeCandidates.filter(c=>c.directional_intent==='LONG');
  const shortZones=activeCandidates.filter(c=>c.directional_intent==='SHORT');
  const conditionalZones=activeCandidates.filter(c=>!['LONG','SHORT'].includes(c.directional_intent));
  const activeTheme=resolvedTheme(appearance.theme,prefersDark);

  return <main className="appShell" data-theme={activeTheme.toLowerCase()} data-font-size={appearance.fontSize.toLowerCase()} data-font-family={appearance.fontFamily.toLowerCase()} data-background-tone={appearance.backgroundTone.toLowerCase()}>
    <header className="topbar"><div><p className="eyebrow">Personal Trading Journal</p><h1>Planning + Decisions + Execution</h1></div><div className="topActions"><button onClick={()=>setShowGuide(true)}>Guide</button><button className={quickMode?'modeButton activeMode':'modeButton'} onClick={()=>setQuickMode(true)}>Quick</button><button className={!quickMode?'modeButton activeMode':'modeButton'} onClick={()=>setQuickMode(false)}>Detailed</button><span className="statusText">{message}</span></div></header>
    {validationErrors.length>0&&!showAnalysis&&!showSettings&&<section className="panel requiredNavigator" role="alert" aria-label="Required fields to complete">
      <div className="panelTitle"><strong>Complete {validationErrors.length} highlighted required field{validationErrors.length===1?'':'s'}</strong><button type="button" onClick={()=>setValidationErrors([])}>Dismiss</button></div>
      <div className="rowActions">{validationErrors.map(id=><button key={id} type="button" className="requiredJump" onClick={()=>jumpToRequiredField(id)}>{validationIssueLabels[id]??FIELD_DEFINITION_BY_ID[id]?.label??id}</button>)}</div>
      <p className="subtle">Select an item to open its page and focus the missing field. Fixing a field removes its highlight; saved custom values must be confirmed before completing.</p>
    </section>}
    {!showAnalysis && !showSettings && <div className="journeyStrip" aria-label="Trading journal workflow">
      <div className="journeyHeading"><strong>YOUR WORKFLOW</strong><span>{active ? `${active.session_date} · ${active.instrument_symbol} · ${active.environment}` : 'Start a DEMO session to begin'}</span></div>
      <div className="journeySteps">
        <div className={active ? 'journeyStep journeyDone' : 'journeyStep journeyCurrent'}><span>01</span><b>Session</b><small>{active ? 'Selected' : 'Start here'}</small></div>
        <div className={plan ? 'journeyStep journeyDone' : active ? 'journeyStep journeyCurrent' : 'journeyStep'}><span>02</span><b>Plan & Zones</b><small>{plan ? 'Confirmed' : active ? 'Draft / confirm' : 'Next'}</small>{active?.status==='DRAFT' && !plan && <div className="journeyDraftLinks"><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(1)}>Plan</button><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(2)}>Zones</button><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(3)}>Review</button></div>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>03</span><b>Evidence</b><small>{plan ? `${Object.values(candidateEvidence).reduce((n,items)=>n+items.length,0)} observed` : 'Record what happened'}</small>{plan && plan.candidates.length>0 && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'})}>Select zone ↓</button>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>04</span><b>Decision</b><small>{plan ? `${Object.values(candidateDecisions).reduce((n,items)=>n+items.length,0)} decisions` : 'Trade / No-trade / Missed'}</small>{plan && plan.candidates.length>0 && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'})}>Select zone ↓</button>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>05</span><b>Execution</b><small>{plan ? `${sessionTrades.length} actual trade(s)` : 'Actual fills & risk'}</small>{plan && sessionTrades.length>0 && <button type="button" className="journeyJump" onClick={()=>{setNotebookPage('EXECUTION');setNotebookMaxPage(v=>Math.max(v,3));window.requestAnimationFrame(()=>document.getElementById('journal-session-trades')?.scrollIntoView({behavior:'smooth',block:'start'}));}}>View trades ↓</button>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>06</span><b>Review</b><small>{sessionReview?.status==='COMPLETED' ? 'Session review completed' : 'Process & learning'}</small>{plan && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-session-review')?.scrollIntoView({behavior:'smooth',block:'start'})}>Session review ↓</button>}</div>
      </div>
      <p className="journeyNote">Only confirmed stages are marked complete. Later stages are available to document actual events; they are not automatically complete.</p>
    </div>}
    <div className="layout">
      <aside className="sidebar">
        <button onClick={newSession}>New session</button>
        <button onClick={()=>{setShowAnalysis(false);refresh()}}>Refresh sessions</button>
        <button className={showAnalysis?'activeMode':''} onClick={openAnalysis}>Analyze</button>
        <button className={showSafety?'activeMode':''} onClick={async()=>{setShowAnalysis(false);setShowSettings(false);setShowSafety(true);window.scrollTo(0,0);await refreshSafety();}}>Safety</button>
        <button className={showSettings?'activeMode':''} onClick={()=>{setShowAnalysis(false);setShowSafety(false);setSettingsSection('APPEARANCE');setShowSettings(true);window.scrollTo(0,0)}}>Settings</button>
        <button onClick={createBackupWithFeedback} disabled={backupBusy}>{backupBusy?'Creating backup…':'Create backup'}</button>
        <button className={showRoadmap?'activeMode':''} onClick={()=>{setShowRoadmap(true);setShowSettings(false);setShowAnalysis(false);setShowSafety(false);window.scrollTo(0,0);}}>Feature Roadmap</button>
        <div className="recent"><strong>Recent</strong>{lastOpenedSessionId&&sessions.some(s=>s.session_id===lastOpenedSessionId)&&<button type="button" className="sessionLink" disabled={active?.session_id===lastOpenedSessionId} onClick={()=>{const previous=sessions.find(s=>s.session_id===lastOpenedSessionId);if(previous)void loadActive(previous);}}>{active?.session_id===lastOpenedSessionId?"Current session":"Resume last opened session"}<small>{sessions.find(s=>s.session_id===lastOpenedSessionId)?.session_date} · {sessions.find(s=>s.session_id===lastOpenedSessionId)?.instrument_symbol} · {lastOpenedSessionId.slice(-6)}</small></button>}{sessions.map(s=><button className={active?.session_id===s.session_id?'sessionLink activeMode':'sessionLink'} key={s.session_id} aria-current={active?.session_id===s.session_id?'true':undefined} onClick={()=>loadActive(s)}>{s.session_date} · {s.instrument_symbol}<small>{s.status} · {s.session_id.slice(-6)}{active?.session_id===s.session_id?' · OPEN NOW':lastOpenedSessionId===s.session_id?' · LAST OPENED':''}</small></button>)}</div>
      </aside>

      <section className="workspace">
        {showGuide&&<div className="guideOverlay" onClick={()=>setShowGuide(false)}><div className="guideCard" onClick={e=>e.stopPropagation()}><div className="panelTitle"><div><h2>Quick workflow guide</h2><p className="subtle">Follow the journal from plan to review. Optional fields can stay empty.</p></div><button onClick={()=>setShowGuide(false)}>Close</button></div><ol className="guideSteps"><li><b>Start session</b> — choose date, instrument, and environment.</li><li><b>Initial plan</b> — set bias and zones. Need to see = confirmation; Abandon if = invalidation.</li><li><b>Confirm plan</b> — the original plan is locked; later changes become revisions.</li><li><b>Live session</b> — update zone status, add evidence, or add a live zone.</li><li><b>Decision</b> — record Trade, No-trade, or Missed.</li><li><b>Execution</b> — add fills, partial exits, and stop changes.</li><li><b>Review</b> — decision quality, exceptions, session review, then backup.</li></ol><p className="guideTip"><b>Quick</b> for normal use; <b>Detailed</b> only when you need extra research detail.</p></div></div>}
        {showSettings&&(settingsSection==='APPEARANCE'
          ?<AppearanceManager onClose={()=>setShowSettings(false)} onInstruments={()=>setSettingsSection('INSTRUMENTS')} onSources={()=>setSettingsSection('SOURCES')} onRequirements={()=>setSettingsSection('REQUIREMENTS')} value={appearance} onSave={saveAppearance}/>
          :settingsSection==='INSTRUMENTS'
            ?<InstrumentManager onClose={()=>setShowSettings(false)} onSwitch={()=>setSettingsSection('SOURCES')} onRequirements={()=>setSettingsSection('REQUIREMENTS')} onAppearance={()=>setSettingsSection('APPEARANCE')} onChanged={refreshInstruments}/>
            :settingsSection==='SOURCES'
              ?<LevelSourceManager onClose={()=>setShowSettings(false)} onSwitch={()=>setSettingsSection('INSTRUMENTS')} onRequirements={()=>setSettingsSection('REQUIREMENTS')} onAppearance={()=>setSettingsSection('APPEARANCE')} onChanged={async()=>setSources(await localApi.listLevelSources())}/>
              :<FieldRequirementManager onClose={()=>setShowSettings(false)} onInstruments={()=>setSettingsSection('INSTRUMENTS')} onSources={()=>setSettingsSection('SOURCES')} onAppearance={()=>setSettingsSection('APPEARANCE')} overrides={requirementOverrides} visibility={fieldVisibility} placements={fieldPlacements} order={fieldOrder} fieldText={fieldText} onFieldTextChanged={async()=>setFieldText(await localApi.getFieldTextPreferences())} onOrderChanged={async()=>setFieldOrder(await localApi.getFieldOrderPreferences())} onPlacementChanged={async()=>setFieldPlacements(await localApi.getFieldPlacementPreferences())} onVisibilityChanged={async()=>setFieldVisibility(await localApi.getFieldVisibilityPreferences())} onChanged={refreshRequirements}/>)} 
        {active&&!showRoadmap&&!showSettings&&!showAnalysis&&<OwnerCustomSelections ownerId={active.session_id} ownerStage="session" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>}
        {active&&!showRoadmap&&!showSettings&&!showAnalysis&&<OwnerTypedCustomFields ownerId={active.session_id} ownerStage="session" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>}
        {active&&active.status==='DRAFT'&&!plan&&!showRoadmap&&!showSettings&&!showAnalysis&&<OwnerCustomSelections ownerId={active.session_id} ownerStage="premarket-plan" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>}
        {active&&active.status==='DRAFT'&&!plan&&!showRoadmap&&!showSettings&&!showAnalysis&&<OwnerTypedCustomFields ownerId={active.session_id} ownerStage="premarket-plan" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>}
        
        {active&&!showRoadmap&&!showSettings&&!showAnalysis&&!showSafety&&plan&&(!quickMode||notebookPage==='DECISION')&&<section className="panel" aria-label="Quick capture" style={{padding:16,marginBottom:16}}>
          <div className="panelTitle"><div><h2>Quick capture</h2><p className="subtle">Current session · choose a Zone, then record a decision. Execution is separate.</p></div></div>
          <div className="rowActions" style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
            <button type="button" onClick={()=>{if(active.status==='DRAFT')setDraftStep(2);else document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'});}} disabled={active.status!=='DRAFT'&&!plan}>View Zones</button>
            {active.status!=='DRAFT'&&plan&&<>
              <label htmlFor="quick-zone-choice">Zone</label>
              <select id="quick-zone-choice" aria-label="Choose current session Zone" value={quickZoneId} onChange={e=>{
                if(decisionCandidate&&(decisionReason.trim()||decisionNote.trim()||decisionQuality||mismatchReason.trim())&&!window.confirm('Unsaved decision details will be lost. Change Zone?'))return;
                setQuickZoneId(e.target.value);setDecisionCandidate(null);
              }}><option value="">Choose Zone</option>{plan.candidates.map(c=><option key={c.candidate_id} value={c.candidate_id}>{c.label||'Unnamed zone'} · {c.directional_intent}</option>)}</select>
              <button type="button" disabled={!quickZoneId||evidenceSaving||decisionSaving} onClick={()=>{
                const zone=plan.candidates.find(c=>c.candidate_id===quickZoneId);if(!zone)return;
                if(decisionCandidate&&(decisionReason.trim()||decisionNote.trim()||decisionQuality||mismatchReason.trim())&&!window.confirm('Discard unsaved decision details and record fresh observed evidence?'))return;
                setDecisionCandidate(null);
                void openEvidence(zone);
              }}>Record evidence</button>
              {(['TRADE','NO_TRADE','MISSED'] as const).map(type=><button key={type} type="button" disabled={!quickZoneId} onClick={()=>{
                const zone=plan.candidates.find(c=>c.candidate_id===quickZoneId);if(!zone)return;
                if(decisionCandidate&&(decisionReason.trim()||decisionNote.trim()||decisionQuality||mismatchReason.trim())&&decisionCandidate.candidate_id!==zone.candidate_id&&!window.confirm('Discard unsaved decision details?'))return;
                if(decisionCandidate?.candidate_id===zone.candidate_id){setDecisionType(type);}else{void openDecision(zone,type);}
                window.requestAnimationFrame(()=>document.getElementById('journal-quick-decision')?.scrollIntoView({behavior:'smooth',block:'start'}));
              }}>{type==='NO_TRADE'?'NO TRADE':type}</button>)}
            </>}
            {pendingTradeDecision&&<button type="button" className="primary" onClick={()=>document.getElementById('journal-quick-entry')?.scrollIntoView({behavior:'smooth',block:'start'})}>Continue trade entry</button>}
          </div>
          <small className="subtle">Selecting a decision does not create an entry or fill; save it in the decision form.</small>
        </section>}
        {active&&<div className="sessionContextBar"><span><b>Session</b>{active.session_date}</span><span><b>Instrument</b>{active.instrument_symbol}</span><span><b>Environment</b>{active.environment.replaceAll('_',' ')}</span><small>{active.status==='DRAFT'?'Draft: session setup can still be edited before plan confirmation.':'Confirmed session: identity is preserved in history; plan changes use revisions.'}</small></div>}
        {showRoadmap ? <FeatureRoadmapPanel onClose={()=>setShowRoadmap(false)}/> : showAnalysis ? <AnalyticsPanel filter={journalFilter} patchFilter={patchJournalFilter} apply={()=>refreshAnalytics()} rows={journalRows} summary={analytics} mistakes={mistakeSummary} sources={sources} evidenceTypes={evidenceTypes} openTrade={async(id)=>{try{const d=await localApi.getTradeDetail(id);setActiveTrade(d);setShowAnalysis(false);const sess=sessions.find(x=>x.session_id===d.metrics.session_id);if(sess)await loadActive(sess);}catch(e){setMessage(String(e));}}}/> : showSafety ? (runtimeReadiness ? <SafetyPanel readiness={runtimeReadiness} selfTest={betaSelfTest} selfTestBusy={betaSelfTestBusy} onSelfTest={runBetaSelfTest} onRefresh={refreshSafety} onBackup={createBackupWithFeedback} backupBusy={backupBusy}/> : <div className="panel"><h2>Local Safety Check</h2><p>Loading safety status…</p></div>) : <>
        {backupResult&&<div role="status" aria-live="polite" className={backupResult.startsWith('Backup failed')?'warningBox':'okBox'} style={{position:'fixed',right:24,top:72,zIndex:1000,maxWidth:480,boxShadow:'0 8px 28px #0008'}}><strong>{backupResult.startsWith('Backup failed')?'Backup failed':'Backup created successfully'}</strong><p style={{overflowWrap:'anywhere'}}>{backupResult}</p><button onClick={()=>setBackupResult('')}>Dismiss</button></div>}
        {!active && runtimeReadiness && !runtimeReadiness.ready_for_live_data && <div className="warningBox"><strong>Local safety check needs attention.</strong> {runtimeReadiness.warnings[0]||'Create a verified backup before recording real-money data.'} <button onClick={()=>setShowSafety(true)}>Review</button></div>}
        {!active && <div className="panel"><h2>Start session</h2><div className="formGrid"><label>Date <FieldHelp id="session.date"/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Instrument <FieldHelp id="session.instrument" value={instrument}/><select value={instrument} onChange={e=>setInstrument(e.target.value)}>{instruments.map(x=><option key={x.instrument_id} value={x.symbol}>{x.symbol}{x.display_name?` — ${x.display_name}`:''}</option>)}</select></label><label>Environment <FieldHelp id="session.environment" value={environment}/><select value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="DEMO">Demo</option><option value="FORWARD_TEST">Forward test</option><option value="REAL">Real</option></select></label></div><button className="primary" onClick={start}>Create draft session</button></div>}

        {active && active.status!=='DRAFT' && !plan && <div className="warningBox"><strong>Confirmed session state detected.</strong> The draft editor is intentionally unavailable because this session is {active.status}. Use another session or reload if its confirmed plan should be visible.</div>}
        {active && active.status==='DRAFT' && !plan && <>
          <div className="stageNav"><strong>Planning: {['','Initial Plan','Zones','Review & Confirm'][draftStep]}</strong><button onClick={beginEditDraftSetup}>Edit session setup</button><button onClick={newSession}>Start another session</button><span>Draft: Save & Continue persists changes locally.</span></div>
          {!quickMode&&<div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>1. Plan</button><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>2. Zones</button><button onClick={()=>saveAndAdvanceDraft(3)} disabled={draftBusy}>3. Review</button></div>}
          {showDraftSetup&&<div className="panel"><div className="panelTitle"><div><h2>Edit session setup</h2><p className="subtle">Available only while the session is still a draft.</p></div><button onClick={()=>setShowDraftSetup(false)}>Close</button></div><div className="formGrid"><label>Date <FieldHelp id="session.date"/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Instrument <FieldHelp id="session.instrument" value={instrument}/><select value={instrument} onChange={e=>setInstrument(e.target.value)}>{instruments.map(x=><option key={x.instrument_id} value={x.symbol}>{x.symbol}{x.display_name?` — ${x.display_name}`:''}</option>)}</select></label><label>Environment <FieldHelp id="session.environment" value={environment}/><select value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="DEMO">Demo</option><option value="FORWARD_TEST">Forward test</option><option value="REAL">Real</option></select></label></div><div className="rowActions"><button onClick={()=>setShowDraftSetup(false)}>Cancel</button><button className="primary" disabled={draftSetupSaving} aria-busy={draftSetupSaving} onClick={saveDraftSessionSetup}>{draftSetupSaving?'Saving…':'Save changes & return to plan'}</button><span role="status" aria-live="polite">{draftSetupFeedback}</span></div></div>}
          {!showDraftSetup&&draftSetupFeedback&&<p role="status" aria-live="polite" className="draftSaveFeedback">{draftSetupFeedback}</p>}
          <div onChangeCapture={()=>{setDraftDirty(true);setDraftSaveFeedback('')}}>
          {draftSaveFeedback&&<p role="status" aria-live="polite" className="draftSaveFeedback">{draftSaveFeedback}</p>}
          {validationErrors.some(id=>id.startsWith('candidate-'))&&draftStep===2&&<p role="alert" className="validationSummary">Required Zone fields are missing or invalid. Check the highlighted price/conditions below before confirming the plan.</p>}
          {draftStep===1&&<><div className="panel"><strong>Plan page {draftPlanPage+1} of 2</strong><div className="rowActions"><button type="button" disabled={draftPlanPage===0} onClick={()=>setDraftPlanPage(0)}>← Market outlook</button><button type="button" disabled={draftPlanPage===1} onClick={()=>setDraftPlanPage(1)}>Scenarios →</button></div></div><div className="panel" style={{display:!quickMode||draftPlanPage===0?'block':'none'}}><h2>Your market plan</h2><p className="subtle">Your expectations before trading — observed market evidence is recorded later.</p><div className="formGrid"><label>Which direction do you currently favor? <small>Market outlook</small> <RequirementBadge id="plan.bias" overrides={requirementOverrides}/> <FieldHelp id="plan.bias" value={bias}/><select value={bias} onChange={e=>setBias(e.target.value as any)}>{['LONG','SHORT','NEUTRAL','MIXED','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label>{isFieldPresented('plan.preSessionState',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="plan.preSessionState" className={invalidClass('plan.preSessionState')}>How do you feel before trading? <small>Pre-session state</small> <RequirementBadge id="plan.preSessionState" overrides={requirementOverrides}/> <FieldHelp id="plan.preSessionState" value={preSessionState}/><small>one quick check</small><select value={preSessionState} onChange={e=>{setPreSessionState(e.target.value);clearValidation('plan.preSessionState')}}><option value="">—</option>{['CALM','FOCUSED','TIRED','FRUSTRATED','DISTRACTED','HESITANT','OVERCONFIDENT','OTHER'].map(x=><option key={x}>{x}</option>)}</select></label>}{isFieldPresented('plan.preSessionStateIntensity',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="plan.preSessionStateIntensity" className={invalidClass('plan.preSessionStateIntensity')}>{fieldText['plan.preSessionStateIntensity']?.label?.trim()||'Pre-session intensity'} <small>{requirementLabel('plan.preSessionStateIntensity',requirementOverrides)}</small>{fieldText['plan.preSessionStateIntensity']?.help&&<small title={fieldText['plan.preSessionStateIntensity'].help}>ⓘ</small>}<select value={preSessionStateIntensity??''} onChange={e=>{setPreSessionStateIntensity(e.target.value?Number(e.target.value):null);clearValidation('plan.preSessionStateIntensity')}}><option value="">—</option>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label>}</div></div><div className="panel" style={{display:!quickMode||draftPlanPage===1?'block':'none'}}><h2>Market scenarios</h2><div className="formGrid">{isFieldPresented('plan.mainScenario',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.mainScenario')}} data-validation-id="plan.mainScenario" className={invalidClass('plan.mainScenario')}>{fieldText['plan.mainScenario']?.label?.trim()||'What do you think price may do?'} {fieldText['plan.mainScenario']?.help&&<small title={fieldText['plan.mainScenario'].help}>ⓘ</small>} <small>Main scenario</small> <RequirementBadge id="plan.mainScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.mainScenario"/><textarea value={mainScenario} onChange={e=>{setMainScenario(e.target.value);clearValidation('plan.mainScenario')}} placeholder={isUserRequired('plan.mainScenario',requirementOverrides)?'Required by you':'Optional'}/></label>}{isFieldPresented('plan.alternativeScenario',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&(isUserRequired('plan.alternativeScenario',requirementOverrides)?<label style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.alternativeScenario')}} data-validation-id="plan.alternativeScenario" className={invalidClass('plan.alternativeScenario')}>{fieldText['plan.alternativeScenario']?.label?.trim()||'What is your backup scenario?'} {fieldText['plan.alternativeScenario']?.help&&<small title={fieldText['plan.alternativeScenario'].help}>ⓘ</small>} <small>Alternative scenario</small> <RequirementBadge id="plan.alternativeScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.alternativeScenario"/><textarea value={altScenario} onChange={e=>{setAltScenario(e.target.value);clearValidation('plan.alternativeScenario')}} placeholder={isUserRequired('plan.alternativeScenario',requirementOverrides)?'Required by you':'Optional'}/></label>:<details style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.alternativeScenario')}} className="guidedMore"><summary>Optional — backup scenario {altScenario.trim()?'(saved)':'(not set)'}</summary><label data-validation-id="plan.alternativeScenario" className={invalidClass('plan.alternativeScenario')}>{fieldText['plan.alternativeScenario']?.label?.trim()||'What is your backup scenario?'} {fieldText['plan.alternativeScenario']?.help&&<small title={fieldText['plan.alternativeScenario'].help}>ⓘ</small>} <small>Alternative scenario</small> <RequirementBadge id="plan.alternativeScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.alternativeScenario"/><textarea value={altScenario} onChange={e=>{setAltScenario(e.target.value);clearValidation('plan.alternativeScenario')}} placeholder={isUserRequired('plan.alternativeScenario',requirementOverrides)?'Required by you':'Optional'}/></label></details>)}</div></div>
          <details className="guidedMore"><summary>Optional — pre-market screenshot</summary><AttachmentPanel ownerType="SESSION" ownerId={active.session_id} defaultStage="PRE_MARKET" title="Pre-market screenshot" compact quickMode={quickMode} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} requirementOverrides={requirementOverrides} fieldText={fieldText}/></details>
          <div className="rowActions">{quickMode&&draftPlanPage===0?<button className="primary" type="button" onClick={()=>setDraftPlanPage(1)}>Next: Scenarios →</button>:<button className="primary" onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>Save & Continue to Zones →</button>}</div></>}
          {draftStep===2&&<>
          {quickMode&&<p className="subtle" aria-live="polite">Zone {Math.min(draftZonePage+1,candidates.length)} of {candidates.length} · Only this Zone is shown; other draft Zones are retained.</p>}
          {candidates.map((c,i)=><div style={{display:!quickMode||draftZonePage===i?'block':'none'}} className="panel" key={i}><div className="panelTitle"><h2>Zone {i+1} — opportunity location</h2>{quickMode&&candidates.length>1&&<div className="rowActions"><button type="button" disabled={i===0} onClick={()=>setDraftZonePage(i-1)}>← Previous</button><button type="button" disabled={i===candidates.length-1} onClick={()=>setDraftZonePage(i+1)}>Next Zone →</button></div>}{candidates.length>1&&<button onClick={()=>{setDraftDirty(true);setValidationErrors([]);setCandidates(v=>v.filter((_,n)=>n!==i));setDraftZonePage(v=>Math.max(0,Math.min(v,candidates.length-2)))}}>Remove</button>}</div><CandidateEditor candidate={c} patch={p=>patchCandidate(i,p)} groupedSources={groupedSources} selected={c.sources.map(s=>s.source_type_id)} toggleSource={id=>toggleSource(i,id)} tickStep={tickStep} requirementOverrides={requirementOverrides} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} fieldText={fieldText} fieldOrder={fieldOrder} quickMode={quickMode} validationPrefix={`candidate-${i}`} validationErrors={validationErrors} clearValidation={clearValidation}/></div>)}
          <div className="rowActions"><button onClick={()=>{setDraftDirty(true);setCandidates(v=>[...v,emptyCandidate()]);setDraftZonePage(candidates.length)}}>+ Add zone</button><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>← Back</button><button className="primary" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(3)}>Save & Continue →</button></div></>}
          {draftStep===3&&<div className="panel"><h2>Review & Confirm</h2><p>Review your initial plan before creating immutable history.</p>
            <p><strong>Session:</strong> {active.session_date} · {active.instrument_symbol} · {active.environment}</p>
            <p><strong>Bias:</strong> {bias}</p>
            <p><strong>Main scenario:</strong> {mainScenario||'Not set'}</p><p><strong>Alternative:</strong> {altScenario||'Not set'}</p>
            <p><strong>Pre-session state:</strong> {preSessionState||'Not set'}{preSessionStateIntensity!=null?` · Intensity ${preSessionStateIntensity}/5`:''}</p>
            <div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>Edit Plan</button><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>Edit Zones</button></div>
            {candidates.map((c,i)=><div key={i} className="panel"><div className="summaryStrip"><span><b>Zone {i+1}</b>{c.label||'Unnamed'}</span><span><b>Intent</b>{c.directional_intent}</span><span><b>Price</b>{c.price_mode==='RANGE'?`${c.price_from??'—'} – ${c.price_to??'—'}`:c.price_mode==='SINGLE'?String(c.reference_price??'—'):'Unspecified'}</span><span><b>Sources</b>{c.sources.length}</span></div>{c.trend_relationship&&c.trend_relationship!=='UNCLEAR'&&<p><strong>Trend context:</strong> {c.trend_relationship.replaceAll('_',' ')}</p>}{c.sources.length>0&&<p><strong>Level sources:</strong> {c.sources.map(source=>groupedSources.flatMap(([,items])=>items).find(item=>item.source_type_id===source.source_type_id)?.label??source.source_type_id).join(', ')}</p>}{cleanLines(c.required_conditions).length>0&&<p><strong>Planned entry conditions:</strong> {cleanLines(c.required_conditions).join('; ')}</p>}{cleanLines(c.invalidation_conditions).length>0&&<p><strong>Abandon idea when:</strong> {cleanLines(c.invalidation_conditions).join('; ')}</p>}</div>)}
            <div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>← Back</button><button className="primary" disabled={draftBusy||confirmingPlan} onClick={confirm}>{confirmingPlan?'Confirming…':'Confirm initial plan'}</button></div>
          </div>}
          </div>
        </>}

        {active&&plan&&<>
          {quickMode&&<nav className="panel" aria-label="Quick notebook pages" style={{padding:12,marginBottom:12}}>
            <strong>Journal pages</strong><p className="subtle">One page at a time. Previously entered values stay in place.</p>
            <div className="rowActions" style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {(['PLAN','EVIDENCE','DECISION','EXECUTION','REVIEW'] as const).map((page,i)=><button key={page} type="button" className={notebookPage===page?'primary':''} aria-current={notebookPage===page?'page':undefined} onClick={()=>{setNotebookPage(page);window.scrollTo({top:0,behavior:'smooth'});}}>{i+1}. {page==='PLAN'?'Zones':page==='DECISION'?'Decision':page==='EVIDENCE'?'Evidence':page==='EXECUTION'?'Trade':'Review'}</button>)}
            </div>
            <div className="rowActions"><button type="button" disabled={notebookPage==='PLAN'} onClick={()=>{const pages=['PLAN','EVIDENCE','DECISION','EXECUTION','REVIEW'] as const;setNotebookPage(pages[Math.max(0,pages.indexOf(notebookPage)-1)]);window.scrollTo(0,0);}}>← Previous</button><button type="button" disabled={notebookPage==='REVIEW'} onClick={()=>{const pages=['PLAN','EVIDENCE','DECISION','EXECUTION','REVIEW'] as const;const nextIndex=Math.min(4,pages.indexOf(notebookPage)+1);setNotebookPage(pages[nextIndex]);setNotebookMaxPage(v=>Math.max(v,nextIndex));window.scrollTo(0,0);}}>Next page →</button></div>
          </nav>}
          <div style={{display:!quickMode||notebookPage==='PLAN'?'block':'none'}}>
          <div id="journal-current-plan" className="panel"><div className="panelTitle"><div><h2>Current plan</h2><p className="subtle">Revision {plan.revision_number} · updated {timeLabel(plan.created_at)}</p></div><div className="headerActions"><button onClick={()=>setShowLiveCandidate(v=>!v)}>+ Add live zone</button><button className="primary" onClick={()=>setShowPlanUpdate(v=>!v)}>Revise plan</button></div></div>
            <div className="summaryStrip"><span><b>Bias</b>{plan.initial_bias}</span><span><b>Active zones</b>{consistency?.active_candidate_count??activeCandidates.length}</span><span><b>Inactive</b>{consistency?.cancelled_candidate_count??0}</span><span className={consistency?.warning_codes.length?'warningCell':'okCell'}><b>Consistency</b>{consistency?.warning_codes.length?`${consistency.warning_codes.length} warning(s)`:'OK'}</span></div>
            {plan.main_scenario&&<p><strong>Main:</strong> {plan.main_scenario}</p>}{plan.alternative_scenario&&<p><strong>Alternative:</strong> {plan.alternative_scenario}</p>}
            {consistency&&consistency.warning_codes.length>0&&<details className="warningBox"><summary>Plan consistency warnings</summary>{consistency.warning_codes.map(x=><div key={x}>{x}</div>)}</details>}

            {showPlanUpdate&&<div className="inlineEditor"><h3>New plan revision</h3><div className="formGrid"><label>Bias change<select value={newBias} onChange={e=>setNewBias(e.target.value)}><option value="">Keep current</option>{['LONG','SHORT','NEUTRAL','MIXED','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label><label data-validation-id="planRevision.reason" className={invalidClass("planRevision.reason")}>Why did the plan change? <textarea value={planReason} onChange={e=>{setPlanReason(e.target.value);clearValidation("planRevision.reason")}} placeholder="Required"/></label>{isFieldPresented('planRevision.evidence',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="planRevision.evidence" className={invalidClass('planRevision.evidence')}>{fieldText['planRevision.evidence']?.label?.trim()||'New evidence summary'} <small>{requirementLabel('planRevision.evidence',requirementOverrides)}</small><textarea value={planEvidence} onChange={e=>{setPlanEvidence(e.target.value);clearValidation('planRevision.evidence')}} placeholder="Observed context for this revision"/></label>}</div><div className="rowActions"><button onClick={()=>setShowPlanUpdate(false)}>Cancel</button><button className="primary" disabled={planRevisionSaving} aria-busy={planRevisionSaving} onClick={savePlanUpdate}>{planRevisionSaving?'Saving…':'Create revision'}</button><span role="status" aria-live="polite">{planRevisionFeedback}</span></div></div>}

            {showLiveCandidate&&<div className="inlineEditor"><h3>Add a new zone during the live session</h3><CandidateEditor candidate={liveCandidate} patch={p=>setLiveCandidate(c=>({...c,...p}))} groupedSources={groupedSources} selected={liveCandidate.sources.map(s=>s.source_type_id)} toggleSource={toggleLiveSource} tickStep={tickStep} requirementOverrides={requirementOverrides} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} fieldText={fieldText} fieldOrder={fieldOrder} quickMode={quickMode} validationPrefix="liveCandidate" validationErrors={validationErrors} clearValidation={clearValidation}/><div className="formGrid"><label data-validation-id="liveZone.reason" className={invalidClass('liveZone.reason')}>Why is this new zone being added?<textarea value={liveCandidateReason} onChange={e=>{setLiveCandidateReason(e.target.value);clearValidation('liveZone.reason');}} placeholder="Required — e.g. new structure / new liquidity information"/></label>{isFieldPresented('planRevision.evidence',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="planRevision.evidence" className={invalidClass('planRevision.evidence')}>{fieldText['planRevision.evidence']?.label?.trim()||'New evidence summary'} <small>{requirementLabel('planRevision.evidence',requirementOverrides)}</small><textarea value={liveCandidateEvidence} onChange={e=>{setLiveCandidateEvidence(e.target.value);clearValidation('planRevision.evidence')}} placeholder="Observed context for adding this Zone"/></label>}</div><div className="rowActions"><button onClick={()=>setShowLiveCandidate(false)}>Cancel</button><button className="primary" disabled={liveZoneSaving} aria-busy={liveZoneSaving} onClick={addLiveZone}>{liveZoneSaving?'Adding…':'Add through new plan revision'}</button><span role="status" aria-live="polite">{liveZoneFeedback}</span></div></div>}
            {!showLiveCandidate&&liveZoneFeedback&&<p role="status" aria-live="polite">{liveZoneFeedback}</p>}

            <div id="journal-zone-actions">{quickMode&&plan.candidates.length>1&&<div className="rowActions"><label htmlFor="notebook-zone">Zone on this page</label><select id="notebook-zone" value={quickZoneId||plan.candidates[0]?.candidate_id||""} onChange={e=>setQuickZoneId(e.target.value)}>{plan.candidates.map(c=><option key={c.candidate_id} value={c.candidate_id}>{c.label||"Unnamed zone"} · {c.directional_intent}</option>)}</select></div>}<div className="planCards">{plan.candidates.filter(c=>!quickMode||c.candidate_id===(quickZoneId||plan.candidates[0]?.candidate_id)).map(c=><article className={`zoneSummary intent-${c.directional_intent.toLowerCase()}`} key={c.candidate_id}><div className="zoneHead"><strong>{c.directional_intent} · {c.label||'Unnamed zone'}</strong><span className={`statusPill status-${c.current_status.toLowerCase()}`}>{c.current_status}</span></div><span>{c.price_mode==='RANGE'?`${c.price_from} – ${c.price_to}`:c.price_mode==='SINGLE'?c.reference_price:'Price not fixed'}</span><p>{c.sources.join(' · ')||'No source recorded'}</p>{c.required_conditions.length>0&&<small>Need: {c.required_conditions.join(' · ')}</small>}
              <OwnerCustomSelections key={'candidate-options-'+c.candidate_id} ownerId={c.candidate_id} ownerStage="candidate" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>
              <OwnerTypedCustomFields key={'candidate-typed-'+c.candidate_id} ownerId={c.candidate_id} ownerStage="candidate" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>
              <OwnerCustomSelections key={'zone-options-'+c.candidate_id} ownerId={c.candidate_id} ownerStage="zone" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>
              <OwnerTypedCustomFields key={'zone-typed-'+c.candidate_id} ownerId={c.candidate_id} ownerStage="zone" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/>
              <div className="quickStatus"><button disabled={zoneStatusSavingId!==null} aria-busy={zoneStatusSavingId===c.candidate_id} onClick={()=>setStatus(c,'WATCHING')}>Watching</button><button disabled={zoneStatusSavingId!==null} onClick={()=>setStatus(c,'REACHED')}>Reached</button><button disabled={zoneStatusSavingId!==null} onClick={()=>setStatus(c,'VALID')}>Valid</button><button disabled={zoneStatusSavingId!==null} onClick={()=>setStatus(c,'INVALIDATED')}>Invalid</button><button disabled={zoneStatusSavingId!==null} onClick={()=>setStatus(c,'CANCELLED')}>Cancel</button>{['INVALIDATED','CANCELLED','EXPIRED'].includes(c.current_status)&&<button disabled={zoneStatusSavingId!==null} onClick={()=>setStatus(c,'PLANNED')}>Reactivate</button>}{zoneStatusFeedbackId===c.candidate_id&&<span role="status" aria-live="polite">{zoneStatusFeedback}</span>}</div><div className="zoneActions"><button onClick={()=>openDecision(c,'TRADE')} className="decisionTrade">Trade</button><button onClick={()=>openDecision(c,'NO_TRADE')}>No-trade</button><button onClick={()=>openDecision(c,'MISSED')}>Missed</button><button onClick={()=>openEvidence(c)}>+ Evidence</button>{!quickMode&&<button onClick={()=>beginCandidateEdit(c)}>Revise zone</button>}</div>{(candidateDecisions[c.candidate_id]?.length??0)>0&&<small className="decisionCount">{candidateDecisions[c.candidate_id].length} decision(s) recorded</small>}</article>)}</div></div>
            <p className="locked">Confirmed records are never overwritten. Updates create new immutable revisions or timestamped events.</p>
          </div>

          {editing&&<div className="panel"><div className="panelTitle"><h2>Revise {editing.label||'zone'}</h2><button onClick={()=>setEditing(null)}>Close</button></div><div className="formGrid"><label>Intent<select value={editIntent} onChange={e=>setEditIntent(e.target.value)}>{['LONG','SHORT','CONDITIONAL','WATCH','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label>{editing.price_mode==='RANGE'&&<><label>From<input type="number" step={tickStep} value={editFrom??''} onChange={e=>setEditFrom(e.target.value?Number(e.target.value):null)}/></label><label>To<input type="number" step={tickStep} value={editTo??''} onChange={e=>setEditTo(e.target.value?Number(e.target.value):null)}/></label></>}{editing.price_mode==='SINGLE'&&<label>Price<input type="number" step={tickStep} value={editSingle??''} onChange={e=>setEditSingle(e.target.value?Number(e.target.value):null)}/></label>}<label data-validation-id="zoneRevision.reason" className={invalidClass('zoneRevision.reason')}>Reason for revision<textarea value={editReason} onChange={e=>{setEditReason(e.target.value);clearValidation('zoneRevision.reason');}} placeholder="Required"/></label></div><SourcePicker grouped={groupedSources} selected={editSourceIds} toggle={toggleEditSource}/><button className="primary" disabled={zoneRevisionSaving} aria-busy={zoneRevisionSaving} onClick={saveCandidateRevision}>{zoneRevisionSaving?'Saving…':'Save new zone revision'}</button><span role="status" aria-live="polite">{zoneRevisionFeedback}</span></div>}
          {!editing&&zoneRevisionFeedback&&<p role="status" aria-live="polite">{zoneRevisionFeedback}</p>}

          </div>
          <div style={{display:!quickMode||notebookPage==='DECISION'?'block':'none'}}>
          {lastDecisionNotice&&!decisionCandidate&&<p role="status" className="okBox">{lastDecisionNotice}</p>}
          {decisionCandidate&&<div className="panel decisionPanel" id="journal-quick-decision"><div className="panelTitle"><div><h2>Decision · {decisionCandidate.label||'Zone'}</h2><p className="subtle">Quick mode records only what matters now. Detailed review can be completed later.</p></div><button onClick={()=>setDecisionCandidate(null)}>Close</button></div>
            <div className="fieldHelpLine"><b>Decision</b><FieldHelp id="decision.type" value={decisionType}/></div><div className="decisionChoice"><button className={decisionType==='TRADE'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>{if(decisionType!=='TRADE'){setDecisionType('TRADE');setDecisionReason('');setMismatchReason('');clearValidation('decision.reason');clearValidation('decision.mismatchReason');}}}>TRADE</button><button className={decisionType==='NO_TRADE'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>{if(decisionType!=='NO_TRADE'){setDecisionType('NO_TRADE');setDecisionReason('');setMismatchReason('');clearValidation('decision.reason');clearValidation('decision.mismatchReason');}}}>NO-TRADE</button><button className={decisionType==='MISSED'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>{if(decisionType!=='MISSED'){setDecisionType('MISSED');setDecisionReason('');setMismatchReason('');clearValidation('decision.reason');clearValidation('decision.mismatchReason');}}}>MISSED</button></div>
            {decisionType==='TRADE'&&<div className="formGrid"><label>Direction<select value={decisionDirection} onChange={e=>{setDecisionDirection(e.target.value as 'LONG'|'SHORT');setMismatchReason('');clearValidation('decision.mismatchReason');}}><option>LONG</option><option>SHORT</option></select></label>{['LONG','SHORT'].includes(decisionCandidate.directional_intent)&&decisionDirection!==decisionCandidate.directional_intent&&<label data-validation-id="decision.mismatchReason" className={`warningField ${invalidClass('decision.mismatchReason')}`}>Why are you going opposite to the plan?<select value={mismatchReason} onChange={e=>{setMismatchReason(e.target.value);clearValidation('decision.mismatchReason')}}><option value="">Select</option><option value="NEW_EVIDENCE">New evidence</option><option value="SCENARIO_INVALIDATED">Original scenario invalidated</option><option value="PLANNED_COUNTERTREND">Planned counter-trend setup</option><option value="PLAN_NOT_UPDATED">Plan not updated yet</option><option value="UNPLANNED_IMPULSE">Unplanned / impulsive</option><option value="OTHER">Other</option></select>{validationErrors.includes('decision.mismatchReason')&&<small role="alert">Required: choose a reason for trading opposite to this Zone's planned direction.</small>}</label>}</div>}
            {decisionType==='NO_TRADE'&&<div data-validation-id="decision.reason" className={`quickReasons ${invalidClass('decision.reason')}`}><span>Why no trade? <FieldHelp id="decision.reason"/></span>{['MISSING_CONFIRMATION','CONTRADICTING_EVIDENCE','INVALIDATION','RISK_UNACCEPTABLE','CONTEXT_WRONG','RULE_PREVENTED','OTHER'].map(x=><button key={x} className={decisionReason===x?'chip selected':'chip'} onClick={()=>{setDecisionReason(x);clearValidation('decision.reason')}}>{x.replaceAll('_',' ')}</button>)}</div>}
            {decisionType==='MISSED'&&<div data-validation-id="decision.reason" className={`quickReasons ${invalidClass('decision.reason')}`}><span>Why missed? <FieldHelp id="decision.reason"/></span>{['HESITATION','DID_NOT_NOTICE','TOO_LATE','OPERATIONAL_ISSUE','DISTRACTED','RISK_LIMIT_REACHED','PLATFORM_ISSUE','OTHER'].map(x=><button key={x} className={decisionReason===x?'chip selected':'chip'} onClick={()=>{setDecisionReason(x);clearValidation('decision.reason')}}>{x.replaceAll('_',' ')}</button>)}</div>}
            <div className="formGrid">{(!quickMode||isUserRequired('decision.quality',requirementOverrides)||fieldPlacements['decision.quality']==='QUICK_AND_DETAILED')&&isFieldPresented('decision.quality',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="decision.quality" className={invalidClass('decision.quality')}>{fieldText['decision.quality']?.label?.trim()||'Decision quality'} <small>{requirementLabel('decision.quality',requirementOverrides)}</small>{fieldText['decision.quality']?.help&&<small title={fieldText['decision.quality'].help}>ⓘ</small>} <FieldHelp id="decision.quality" value={decisionQuality}/><select value={decisionQuality} onChange={e=>{setDecisionQuality(e.target.value as any);clearValidation('decision.quality')}}><option value="">Complete later</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label>}{isFieldPresented('decision.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="decision.note" className={invalidClass('decision.note')}>{fieldText['decision.note']?.label?.trim()||'Decision note'}{isUserRequired('decision.note',requirementOverrides)?' (Required)':' (Optional)'}{fieldText['decision.note']?.help&&<small title={fieldText['decision.note'].help}>ⓘ</small>}<textarea value={decisionNote} onChange={e=>{setDecisionNote(e.target.value);clearValidation('decision.note')}} placeholder={isUserRequired('decision.note',requirementOverrides)?'Explain why this decision was made':'Optional: add useful decision context'}/></label>}</div>
            <div className="decisionSnapshot"><span><b>Planned intent</b>{decisionCandidate.directional_intent}</span><span><b>Status</b>{decisionCandidate.current_status}</span><span><b>Sources</b>{decisionCandidate.sources.slice(0,3).join(' · ')||'—'}</span></div>
            <div className="rowActions"><button disabled={decisionSaving} onClick={()=>setDecisionCandidate(null)}>Cancel</button><button className="primary" disabled={decisionSaving} onClick={saveDecision}>{decisionSaving?'Saving…':'Save decision'}</button></div>{decisionSaveFeedback&&<p role="alert" className="warningBox">{decisionSaveFeedback}</p>}
            {(candidateDecisions[decisionCandidate.candidate_id]??[]).length>0&&<details><summary>Previous decisions at this zone</summary>{candidateDecisions[decisionCandidate.candidate_id].slice(0,6).map(d=><div className="decisionHistory" key={d.decision_id}><time>{timeLabel(d.occurred_at)}</time><b>{d.decision_type}{d.intended_direction?` · ${d.intended_direction}`:''}</b><small>{d.reason_code||d.plan_alignment||'—'}</small>{d.plan_mismatch_reason&&<small>Opposite-plan reason: {d.plan_mismatch_reason}</small>}</div>)}</details>}
          </div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='EVIDENCE'?'block':'none'}}>
          {quickMode&&!evidenceCandidate&&<div className="panel"><h2>Evidence for this Zone</h2><p className="subtle">Only record observations that actually happened. Skip if none.</p>{plan.candidates.length>0&&<button type="button" onClick={()=>{const c=plan.candidates.find(x=>x.candidate_id===quickZoneId)??plan.candidates[0];void openEvidence(c);}}>Record evidence</button>}</div>}
          {evidenceCandidate&&<div className="panel"><div className="panelTitle"><div><h2>Quick evidence · {evidenceCandidate.label||'Zone'}</h2><p className="subtle">Capture what appeared now. Level provenance remains separate.</p></div><button onClick={()=>setEvidenceCandidate(null)}>Close</button></div><div className={'evidencePicker '+invalidClass('evidence.selection')} data-validation-id="evidence.selection"><p className="subtle">Select all observations actually seen. Mark each as supporting or contradicting only if you decide; unclassified is the default.</p>{groupedEvidence.map(([group,items])=><div className="sourceGroup" key={group}><strong>{group.replaceAll('_',' ')}</strong><div className="chips">{items.map(e=><button type="button" key={e.evidence_type_id} disabled={evidenceSaving||evidenceSaved||savedEvidenceIds.length>0} aria-pressed={selectedEvidenceIds.includes(e.evidence_type_id)} className={selectedEvidenceIds.includes(e.evidence_type_id)?'chip selected':'chip'} onClick={()=>{setSelectedEvidenceIds(v=>v.includes(e.evidence_type_id)?v.filter(x=>x!==e.evidence_type_id):[...v,e.evidence_type_id]);clearValidation('evidence.selection')}}>{e.label}</button>)}</div></div>)}</div>{selectedEvidenceIds.length>0&&<div className="panel"><strong>Selected ({selectedEvidenceIds.length})</strong>{selectedEvidenceIds.map(id=><div className="rowActions" key={id}><span>{evidenceTypes.find(t=>t.evidence_type_id===id)?.label??id}</span><select aria-label={'Classification for '+id} disabled={evidenceSaving||evidenceSaved||savedEvidenceIds.includes(id)} value={evidenceStances[id]??'GENERAL_OBSERVATION'} onChange={e=>setEvidenceStances(v=>({...v,[id]:e.target.value as 'GENERAL_OBSERVATION'|'SETUP_SUPPORT'|'CONTRADICTING_EVIDENCE'|'ENTRY_CONFIRMATION'|'INVALIDATION'}))}><option value="GENERAL_OBSERVATION">Unclassified</option><option value="SETUP_SUPPORT">Supporting</option><option value="CONTRADICTING_EVIDENCE">Contradicting</option>{!quickMode&&<><option value="ENTRY_CONFIRMATION">Entry confirmation</option><option value="INVALIDATION">Invalidation</option></>}</select></div>)}</div>}<div className="formGrid">{isFieldPresented("evidence.direction",quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="evidence.direction" className={invalidClass("evidence.direction")}>{fieldText["evidence.direction"]?.label?.trim()||"Observed direction"} <small>{requirementLabel("evidence.direction",requirementOverrides)}</small><FieldHelp id="evidence.direction"/><select disabled={evidenceSaving||evidenceSaved} value={evidenceDirection} onChange={e=>{setEvidenceDirection(e.target.value as any);clearValidation("evidence.direction")}}><option value="">Not selected (saves Neutral)</option><option value="NEUTRAL">Neutral (explicit)</option><option value="BUY">Buy</option><option value="SELL">Sell</option></select></label>}{orderFieldIdsWithinSection(['evidence.price','evidence.note'],fieldOrder).map(id=><div key={id}>{id==='evidence.price'?isFieldPresented('evidence.price',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="evidence.price" className={invalidClass('evidence.price')}>{fieldText['evidence.price']?.label?.trim()||'Observed price'} <small>{isUserRequired('evidence.price',requirementOverrides)?'Required':'Optional'}</small>{fieldText['evidence.price']?.help?<small title={fieldText['evidence.price'].help}>ⓘ</small>:<FieldHelp id="evidence.price"/>}<input type="number" step={tickStep} disabled={evidenceSaving||evidenceSaved} value={evidencePrice??''} onChange={e=>{setEvidencePrice(e.target.value===''?null:Number(e.target.value));clearValidation('evidence.price')}}/></label>:isFieldPresented('evidence.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="evidence.note" className={invalidClass('evidence.note')}>{fieldText['evidence.note']?.label?.trim()||'Evidence note'} <small>{isUserRequired('evidence.note',requirementOverrides)?'Required':'Optional'}</small>{fieldText['evidence.note']?.help?<small title={fieldText['evidence.note'].help}>ⓘ</small>:<FieldHelp id="evidence.note"/>}<textarea disabled={evidenceSaving||evidenceSaved} value={evidenceNote} onChange={e=>{setEvidenceNote(e.target.value);clearValidation('evidence.note')}} placeholder={isUserRequired('evidence.note',requirementOverrides)?'Describe the observed evidence':'Optional'}/></label>}</div>)}</div><div className="rowActions">{evidenceSaved?<button className="primary" type="button" onClick={()=>{setEvidenceSaved(false);setEvidenceFeedback("");setSelectedEvidenceIds([]);setSavedEvidenceIds([]);setEvidenceStances({});setEvidenceDirection("NEUTRAL");setEvidencePrice(null);setEvidenceNote("");}}>Record another observation</button>:<button className="primary" type="button" disabled={evidenceSaving} onClick={saveEvidence}>{evidenceSaving?"Saving…":'Capture '+selectedEvidenceIds.length+' observation(s)'}</button>}</div>{evidenceSaved&&<div className="rowActions" aria-label="Continue to a decision for this Zone"><span>Next: decide for this Zone</span>{(['TRADE','NO_TRADE','MISSED'] as const).map(type=><button key={type} type="button" disabled={!!pendingTradeDecision||decisionSaving||evidenceSaving} onClick={()=>{void openDecision(evidenceCandidate,type);}}>{type==='NO_TRADE'?'NO TRADE':type}</button>)}{pendingTradeDecision&&<small>Complete the already saved trade decision first.</small>}<small>Choose an intent; review and save the decision separately. No execution is created here.</small></div>}{evidenceFeedback&&<p role="status" aria-live="polite" className={evidenceSaved?"okBox":"warningBox"}>{evidenceFeedback}</p>}<div className="evidenceHistory"><h3>Recent evidence</h3>{(candidateEvidence[evidenceCandidate.candidate_id]??[]).slice(0,8).map(ev=><div className="evidenceRow" key={ev.evidence_id}><time>{timeLabel(ev.occurred_at)}</time><div><b>{ev.evidence_label}</b><small>{ev.role} · {ev.direction||'—'}{ev.price!=null?` · ${ev.price}`:''}</small>{ev.note&&<span>{ev.note}</span>}</div></div>)}</div></div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='EXECUTION'?'block':'none'}}>
          {quickMode&&!pendingTradeDecision&&!activeTrade&&sessionTrades.length===0&&<div className="panel"><h2>Trade entry</h2><p className="subtle">No trade entry yet. Record a TRADE decision first; a decision alone does not create a fill.</p></div>}
          {pendingTradeDecision&&<div className="panel executionPanel" id="journal-quick-entry"><div className="panelTitle"><div><h2>Quick trade entry</h2><p className="subtle">Only the essentials now. Review can be completed later.</p></div><button onClick={()=>setPendingTradeDecision(null)}>Close</button></div><div className="formGrid"><label data-validation-id="trade.entryPrice" className={invalidClass('trade.entryPrice')}>Entry price <FieldHelp id="trade.entryPrice"/> <small>Full market price</small><input type="number" step={tickStep} value={entryPrice??''} onChange={e=>{setEntryPrice(e.target.value?Number(e.target.value):null);clearValidation('trade.entryPrice')}} placeholder="e.g. 6025.25"/></label><label data-validation-id="trade.stopPrice" className={invalidClass('trade.stopPrice')}>Initial stop price <FieldHelp id="trade.stopPrice"/> <small>Full market price</small><input type="number" step={tickStep} value={stopPrice??''} onChange={e=>{setStopPrice(e.target.value?Number(e.target.value):null);clearValidation('trade.stopPrice')}} placeholder="e.g. 6022.25"/></label><label data-validation-id="trade.quantity" className={invalidClass('trade.quantity')}>Quantity <FieldHelp id="trade.quantity"/><input type="number" min="1" step="1" value={tradeQty} onChange={e=>{setTradeQty(e.target.value===''?0:Number(e.target.value));clearValidation('trade.quantity')}}/></label>{isFieldPresented('trade.plannedTarget',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="trade.plannedTarget" className={invalidClass('trade.plannedTarget')}>{fieldText['trade.plannedTarget']?.label?.trim()||'Planned target'} <RequirementBadge id="trade.plannedTarget" overrides={requirementOverrides}/>{fieldText['trade.plannedTarget']?.help&&<small title={fieldText['trade.plannedTarget'].help}>ⓘ</small>} <FieldHelp id="trade.plannedTarget"/><input type="number" step={tickStep} value={plannedTarget??''} onChange={e=>{setPlannedTarget(e.target.value?Number(e.target.value):null);clearValidation('trade.plannedTarget')}}/></label>}</div><div className="summaryStrip" role="status" aria-live="polite">
            <span><b>Initial risk (gross)</b>{entryRiskPreview.riskDollars===null?'Enter valid entry, stop and quantity':`${entryRiskPreview.riskDollars.toFixed(2)} ${active?.instrument_currency??''}`}</span>
            <span><b>Stop distance</b>{entryRiskPreview.riskTicks===null?'—':`${entryRiskPreview.riskTicks.toFixed(0)} ticks`}</span>
            <span><b>Planned reward (gross)</b>{entryRiskPreview.targetRewardDollars===null?'Not entered':`${entryRiskPreview.targetRewardDollars.toFixed(2)} ${active?.instrument_currency??''}`}</span>
            <span><b>Planned gross R</b>{entryRiskPreview.targetGrossR===null?'—':`${entryRiskPreview.targetGrossR.toFixed(2)}R`}</span>
          </div>{entryRiskPreview.problems.length>0&&<p className="warningBox" role="alert">{entryRiskPreview.problems.map(x=>x.label).join(' · ')}</p>}
          <p className="subtle">Calculated from this Session's saved tick size and point value. This is planned price risk before commissions, fees, slippage or a future outcome; it is not a proven trade edge.</p>
          <details className="guidedMore"><summary>Entry commission and fees (optional)</summary>
            <p className="subtle">Total amounts for this entry fill in the instrument currency, not per contract. Blank means unknown; enter 0 only when confirmed zero. Recorded values cannot be silently edited.</p>
            <div className="formGrid"><label data-validation-id="trade.entryCommission" className={invalidClass('trade.entryCommission')}>Commission (total)<input type="number" min="0" step="any" value={entryCommissionInput} onChange={e=>{setEntryCommissionInput(e.target.value);clearValidation('trade.entryCommission')}} placeholder="Unknown"/></label><label data-validation-id="trade.entryFees" className={invalidClass('trade.entryFees')}>Other fees (total)<input type="number" min="0" step="any" value={entryFeesInput} onChange={e=>{setEntryFeesInput(e.target.value);clearValidation('trade.entryFees')}} placeholder="Unknown"/></label></div>
          </details><button className="primary" disabled={tradeOpening} aria-busy={tradeOpening} onClick={createExecutedTrade}>{tradeOpening?'Opening…':'Open trade'}</button><span role="status" aria-live="polite">{tradeOpeningFeedback}</span></div>}

          {sessionTrades.some(t=>t.status==='CLOSED')&&<div className="panel"><div className="panelTitle"><div><h2>Review Pending</h2><p className="subtle">Closed trades can be reviewed later. This does not block a new trade.</p></div><button disabled={reviewQueueLoading} onClick={loadReviewPending}>{reviewQueueLoading?'Checking…':'Refresh reviews'}</button></div><p className="subtle">Automatically checked against saved trade reviews. Closing a trade does not block another entry.</p>{reviewQueueError&&<p role="alert" className="warningBox">{reviewQueueError}</p>}{reviewQueueLoading&&<p role="status">Checking saved reviews…</p>}{!reviewQueueLoading&&reviewQueueSessionId===active.session_id&&reviewQueue!==null&&<div className="tradeList">{reviewQueue.length===0?<p role="status">All closed trades in this session have completed reviews.</p>:reviewQueue.map(t=><button className="tradeRow" key={t.trade_id} onClick={()=>openTradeDetail(t)}><b>{t.direction}</b><span>Review pending</span><span>{t.realized_r==null?'R —':`${t.realized_r.toFixed(2)}R`}</span><span>Open review</span></button>)}</div>}</div>}
          {sessionTrades.length>0&&<div id="journal-session-trades" className="panel"><div className="panelTitle"><div><h2>Trades this session</h2><p className="subtle">Quick operational view — detailed review stays separate.</p></div></div><div className="tradeList">{sessionTrades.map(t=><button className="tradeRow" key={t.trade_id} onClick={()=>openTradeDetail(t)}><b>{t.direction}</b><span>{t.status}</span><span>Qty open {t.open_quantity}</span><span>{t.realized_r==null?'R —':`${t.realized_r.toFixed(2)}R`}</span></button>)}</div></div>}

          {activeTrade&&<div className="panel executionPanel"><div className="panelTitle"><div><h2>Open trade / execution</h2><p className="subtle">{activeTrade.metrics.direction} · {activeTrade.metrics.status}</p></div><button onClick={()=>setActiveTrade(null)}>Close</button></div>{activeTrade.metrics.status==='CLOSED'&&activeTrade.metrics.candidate_id&&plan?.candidates.some(c=>c.candidate_id===activeTrade.metrics.candidate_id)&&<div className="rowActions"><button type="button" onClick={()=>beginSameZoneReentry(activeTrade.metrics)}>New independent decision in this Zone</button><small>Creates a separate decision; the previous trade and review stay unchanged.</small></div>}<div className="summaryStrip"><span><b>Avg entry</b>{activeTrade.metrics.average_entry?.toFixed(2)??'—'}</span><span><b>Open qty</b>{activeTrade.metrics.open_quantity}</span><span><b>Stop</b>{activeTrade.metrics.latest_stop_price?.toFixed(2)??'—'}</span><span><b>Initial risk</b>{activeTrade.metrics.initial_risk_dollars==null?'—':`$${activeTrade.metrics.initial_risk_dollars.toFixed(2)}`}</span><span><b>Net R (known costs)</b>{activeTrade.metrics.realized_r==null?'—':`${activeTrade.metrics.realized_r.toFixed(2)}R`}</span><span><b>Cost entries</b>{fillCostCoverage(activeTrade.fills).completeFillCount}/{fillCostCoverage(activeTrade.fills).fillCount} complete</span></div>{activeTrade.metrics.total_exit_quantity>0&&!fillCostCoverage(activeTrade.fills).allKnown&&<p role="status" className="warningBox">Net P&amp;L and R are provisional: {fillCostCoverage(activeTrade.fills).unknownFields} cost field(s) have unknown amounts. The calculation currently treats missing costs as zero; do not interpret this as confirmed zero.</p>}{executionAccountingCautions(activeTrade.fills).map(caution=><p key={caution} role="alert" className="warningBox">{caution}</p>)}{activeTrade.metrics.status!=='CLOSED'&&<><div className="executionActions"><div><h3>Add fill</h3><div className="formGrid"><label>Action<select value={fillAction} onChange={e=>setFillAction(e.target.value as 'ENTRY'|'EXIT')}><option value="EXIT">Partial / full exit</option><option value="ENTRY">Additional entry</option></select></label><label data-validation-id="fill.price" className={invalidClass('fill.price')}>Price<input type="number" step={tickStep} value={fillPrice??''} onChange={e=>{setFillPrice(e.target.value===''?null:Number(e.target.value));clearValidation('fill.price')}}/></label><div><label data-validation-id="fill.quantity" className={invalidClass('fill.quantity')}>Qty<input type="number" min="1" step="1" value={fillQty} onChange={e=>{setFillQty(e.target.value===''?0:Number(e.target.value));clearValidation('fill.quantity')}}/></label>{fillAction==='EXIT'&&<button type="button" disabled={fillSaving||activeTrade.metrics.open_quantity<=0} onClick={()=>{setFillQty(activeTrade.metrics.open_quantity);clearValidation('fill.quantity')}}>Use full remaining qty ({activeTrade.metrics.open_quantity})</button>}</div>{isFieldPresented('fill.reason',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="fill.reason" className={invalidClass('fill.reason')}>{fieldText['fill.reason']?.label?.trim()||'Fill reason'} <small>{requirementLabel('fill.reason',requirementOverrides)}</small><input value={fillReason} onChange={e=>{setFillReason(e.target.value);clearValidation('fill.reason')}} placeholder="Target / risk reduction / other"/></label>}</div><details className="guidedMore"><summary>Commission and fees for this fill (optional)</summary>
            <p className="subtle">Total amounts for this particular fill, not per contract. Blank means unknown; 0 means confirmed zero. These amounts affect net P&L and net R.</p>
            <div className="formGrid"><label data-validation-id="fill.commission" className={invalidClass('fill.commission')}>Commission (total)<input type="number" min="0" step="any" value={fillCommissionInput} onChange={e=>{setFillCommissionInput(e.target.value);clearValidation('fill.commission')}} placeholder="Unknown"/></label><label data-validation-id="fill.fees" className={invalidClass('fill.fees')}>Other fees (total)<input type="number" min="0" step="any" value={fillFeesInput} onChange={e=>{setFillFeesInput(e.target.value);clearValidation('fill.fees')}} placeholder="Unknown"/></label></div>
          </details><button disabled={fillSaving} aria-busy={fillSaving} onClick={addFill}>{fillSaving?'Saving fill…':'Save fill'}</button>{fillFeedback&&<p role="status" aria-live="polite" className="exportMessage">{fillFeedback}</p>}</div><div><h3>Move stop</h3><div className="formGrid"><label data-validation-id="management.stop" className={invalidClass('management.stop')}>New stop<input type="number" step={tickStep} value={newStop??''} onChange={e=>{setNewStop(e.target.value===''?null:Number(e.target.value));clearValidation('management.stop')}}/></label>{isFieldPresented('management.reason',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="management.reason" className={invalidClass('management.reason')}>{fieldText['management.reason']?.label?.trim()||'Stop management reason'} <small>{requirementLabel('management.reason',requirementOverrides)}</small><input value={stopReason} onChange={e=>{setStopReason(e.target.value);clearValidation('management.reason')}} placeholder="BE / structure / trail / other"/></label>}</div><button disabled={stopSaving} aria-busy={stopSaving} onClick={moveStop}>{stopSaving?'Saving…':'Save stop change'}</button><span role="status" aria-live="polite">{stopFeedback}</span></div></div></>}{!isCompletedReviewForTrade(tradeReview,reviewOwnerTradeId,activeTrade.metrics.trade_id)&&<><OwnerCustomSelections key={'trade-options-'+activeTrade.metrics.trade_id} ownerId={activeTrade.metrics.trade_id} ownerStage="trade" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/><OwnerTypedCustomFields key={'trade-typed-'+activeTrade.metrics.trade_id} ownerId={activeTrade.metrics.trade_id} ownerStage="trade" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/></>}<AttachmentPanel ownerType="TRADE" ownerId={activeTrade.metrics.trade_id} defaultStage={activeTrade.metrics.status==='CLOSED'?'POST_EXIT':'DURING'} title={activeTrade.metrics.status==='CLOSED'?'Post-exit screenshot':'Trade screenshot'} compact quickMode={quickMode} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} requirementOverrides={requirementOverrides} fieldText={fieldText}/><details open><summary>Execution timeline</summary>{activeTrade.fills.map(f=><div className="decisionHistory" key={f.execution_id}><time>{f.occurred_at?timeLabel(f.occurred_at):'—'}</time><b>{f.action} · {f.side}</b><small>{f.quantity} @ {f.price.toFixed(2)} · commission {f.commission==null?'unknown':f.commission.toFixed(2)} · fees {f.fees==null?'unknown':f.fees.toFixed(2)}{f.note?` · ${f.note}`:''}</small></div>)}</details>{activeTrade.metrics.status==='CLOSED'&&<div className="postReview"><h3>Quick post-trade review</h3><p className="subtle">Keep it short. Detailed fields only open when useful.</p>{isCompletedReviewForTrade(tradeReview,reviewOwnerTradeId,activeTrade.metrics.trade_id)?<div className="locked">Review completed and locked.</div>:<><div className="formGrid">{isFieldPresented('review.decisionQuality',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.decisionQuality" className={invalidClass('review.decisionQuality')}>Decision quality <FieldHelp id="review.decisionQuality" value={reviewDecisionQuality}/><select value={reviewDecisionQuality} onChange={e=>{setReviewDecisionQuality(e.target.value as any);clearValidation('review.decisionQuality')}}><option value="">Complete later</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label>}{isFieldPresented('review.executionQuality',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.executionQuality" className={invalidClass('review.executionQuality')}>Execution <FieldHelp id="review.executionQuality" value={reviewExecutionQuality}/><select value={reviewExecutionQuality} onChange={e=>{setReviewExecutionQuality(e.target.value as any);clearValidation('review.executionQuality')}}><option value="">Optional</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="UNCLEAR">Unclear</option></select></label>}{isFieldPresented('review.managementQuality',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.managementQuality" className={invalidClass('review.managementQuality')}>Management <FieldHelp id="review.managementQuality" value={reviewManagementQuality}/><select value={reviewManagementQuality} onChange={e=>{setReviewManagementQuality(e.target.value as any);clearValidation('review.managementQuality')}}><option value="">Optional</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="UNCLEAR">Unclear</option></select></label>}{isFieldPresented('review.exitReason',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.exitReason" className={invalidClass('review.exitReason')}>Exit reason <small>{requirementLabel('review.exitReason',requirementOverrides)}</small><select value={reviewExitReason} onChange={e=>{setReviewExitReason(e.target.value);clearValidation('review.exitReason')}}><option value="">—</option>{['TARGET','STOP','SETUP_INVALIDATED','PRICE_ACTION_CHANGED','RISK_REDUCTION','EARLY_EXIT','FEAR','TIME_BASED','OTHER'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>}</div><div data-validation-id="psychology.emotionAffected" className={`psychQuick ${invalidClass('psychology.emotionAffected')}`}><strong>Did emotion affect this trade? <FieldHelp id="psychology.emotionAffected" value={emotionAffected===true?'YES':emotionAffected===false?'NO':''}/></strong><div className="rowActions"><button className={emotionAffected===false?'selectedButton':''} onClick={()=>{setEmotionAffected(false);setPsychState('');setPsychIntensity(null);setPsychStage('');clearValidation('psychology.emotionAffected');clearValidation('psychology.state');clearValidation('psychology.stage');clearValidation('psychology.intensity')}}>No</button><button className={emotionAffected===true?'selectedButton':''} onClick={()=>{setEmotionAffected(true);clearValidation('psychology.emotionAffected')}}>Yes</button></div>{emotionAffected===true&&<div className="formGrid"><label data-validation-id="psychology.state" className={invalidClass('psychology.state')}>Main state <FieldHelp id="psychology.state" value={psychState}/><select value={psychState} onChange={e=>{setPsychState(e.target.value);clearValidation('psychology.state')}}><option value="">Choose</option>{['FEAR','FOMO','FRUSTRATION','REVENGE','HESITATION','OVERCONFIDENCE','OTHER'].map(x=><option key={x}>{x}</option>)}</select></label><label data-validation-id="psychology.stage" className={invalidClass('psychology.stage')}>Affected stage <FieldHelp id="psychology.stage" value={psychStage}/><select value={psychStage} onChange={e=>{setPsychStage(e.target.value as any);clearValidation('psychology.stage')}}><option value="">Choose</option><option>ENTRY</option><option>MANAGEMENT</option><option>EXIT</option><option>MULTIPLE</option></select></label>{isFieldPresented('psychology.intensity',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="psychology.intensity" className={invalidClass('psychology.intensity')}>{fieldText['psychology.intensity']?.label?.trim()||'Emotion intensity'} <small>{requirementLabel('psychology.intensity',requirementOverrides)}</small>{fieldText['psychology.intensity']?.help&&<small title={fieldText['psychology.intensity'].help}>ⓘ</small>}<select value={psychIntensity??''} onChange={e=>{setPsychIntensity(e.target.value?Number(e.target.value):null);clearValidation('psychology.intensity')}}><option value="">—</option>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label>}</div>}</div><div className="psychQuick"><strong>Any rule broken?</strong><div className="rowActions"><button className={ruleViolationReported===false?'selectedButton':''} onClick={()=>{setRuleViolationReported(false);setViolatedRuleIds([])}}>No</button><button className={ruleViolationReported===true?'selectedButton':''} onClick={()=>setRuleViolationReported(true)}>Yes</button></div>{ruleViolationReported===true&&<><div className="chips">{rules.filter(r=>r.scope==='TRADE'||r.scope==='BOTH').map(r=><button type="button" key={r.rule_version_id} className={violatedRuleIds.includes(r.rule_version_id)?'chip selected':'chip'} onClick={()=>toggleRuleViolation(r.rule_version_id)}>{r.label}</button>)}</div>{isFieldPresented('rule.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="rule.note" className={invalidClass('rule.note')}>{fieldText['rule.note']?.label?.trim()||'Rule note'} <small>{requirementLabel('rule.note',requirementOverrides)}</small><input value={ruleNote} onChange={e=>{setRuleNote(e.target.value);clearValidation('rule.note')}} placeholder="Only if useful"/></label>}</>}</div><details open={['review.exitNote','review.note'].some(id=>isUserRequired(id,requirementOverrides)||validationErrors.includes(id))}><summary>Mistakes / advanced review</summary>{isFieldPresented('review.mistakes',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<div className="sourceGroups">{Object.entries(mistakeTypes.reduce<Record<string,MistakeType[]>>((a,m)=>((a[m.mistake_group]??=[]).push(m),a),{})).map(([g,items])=><div className="sourceGroup" key={g}><strong>{g}</strong><div className="chips">{items.map(m=><button type="button" className={reviewMistakes.includes(m.mistake_type_id)?'chip selected':'chip'} onClick={()=>toggleReviewMistake(m.mistake_type_id)} key={m.mistake_type_id}>{m.label}</button>)}</div></div>)}</div>}<div className="formGrid">{isFieldPresented('review.exitNote',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.exitNote" className={invalidClass('review.exitNote')}>Exit note <small>{requirementLabel('review.exitNote',requirementOverrides)}</small><textarea value={reviewExitNote} onChange={e=>{setReviewExitNote(e.target.value);clearValidation('review.exitNote')}} placeholder="Only if useful"/></label>}{isFieldPresented('review.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="review.note" className={invalidClass('review.note')}>Review note <small>{requirementLabel('review.note',requirementOverrides)}</small><textarea value={reviewNote} onChange={e=>{setReviewNote(e.target.value);clearValidation('review.note')}} placeholder="Only if useful"/></label>}</div></details><OwnerCustomSelections key={'review-select-'+activeTrade.metrics.trade_id} ownerId={activeTrade.metrics.trade_id} ownerStage="post-trade-review" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/><OwnerTypedCustomFields key={'review-typed-'+activeTrade.metrics.trade_id} ownerId={activeTrade.metrics.trade_id} ownerStage="post-trade-review" quickMode={quickMode} validationErrors={validationErrors} onSaved={clearValidation}/><div className="rowActions"><button disabled={reviewSaving} aria-busy={reviewSaving} onClick={()=>saveReview(false)}>{reviewSaving?'Saving…':'Save draft'}</button><button className="primary" disabled={reviewSaving} aria-busy={reviewSaving} onClick={()=>saveReview(true)}>{reviewSaving?'Saving…':'Complete review'}</button><span role="status" aria-live="polite">{reviewFeedback}</span></div></>}</div>}</div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='REVIEW'?'block':'none'}}>
          <div id="journal-session-review" className="panel"><div className="panelTitle"><div><h2>Session review</h2><p className="subtle">Mostly derived. Only add the lessons that are worth remembering.</p></div><button onClick={openSessionReview}>{showSessionReview?'Refresh summary':'End session / review'}</button></div>{showSessionReview&&<>{sessionReviewSummary&&<div className="summaryStrip"><span><b>Trades</b>{sessionReviewSummary.trade_count}</span><span><b>Net R</b>{sessionReviewSummary.net_r==null?'—':`${sessionReviewSummary.net_r.toFixed(2)}R`}</span><span><b>No-trade</b>{sessionReviewSummary.no_trade_count}</span><span><b>Missed</b>{sessionReviewSummary.missed_count}</span><span><b>Rule violations</b>{sessionReviewSummary.rule_violation_count}</span></div>}{sessionReview?.status==='COMPLETED'?<div className="locked"><strong>Session review completed and locked.</strong><p>Saved review answers (read-only):</p>{([['What went well?',sessionReview.what_went_well],['One thing to improve next session',sessionReview.next_improvement],['Overall',sessionReview.overall_assessment],['What went poorly?',sessionReview.what_went_poorly],['Best decision',sessionReview.best_decision],['Biggest mistake',sessionReview.biggest_mistake],['Market learning',sessionReview.market_learning],['Plan quality',sessionReview.plan_quality],['Discipline',sessionReview.discipline]] as Array<[string,string|null|undefined]>).filter(([,v])=>Boolean(v)).map(([k,v])=><p key={k}><b>{k}</b>: {v}</p>)}</div>:<><div className="formGrid">{orderFieldIdsWithinSection(['sessionReview.wentWell','sessionReview.nextImprovement'],fieldOrder).map(id=>
  id==='sessionReview.wentWell'
    ?(isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.wentWell']?.label?.trim()||'What went well?'} <small>{requirementLabel('sessionReview.wentWell',requirementOverrides)}</small>{fieldText['sessionReview.wentWell']?.help&&<small title={fieldText['sessionReview.wentWell'].help}>ⓘ</small>}<textarea value={srWentWell} onChange={e=>setSrWentWell(e.target.value)} /></label>)
    :(isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.nextImprovement']?.label?.trim()||'One thing to improve next session'} <small>{requirementLabel('sessionReview.nextImprovement',requirementOverrides)}</small>{fieldText['sessionReview.nextImprovement']?.help&&<small title={fieldText['sessionReview.nextImprovement'].help}>ⓘ</small>}<textarea value={srNextImprovement} onChange={e=>setSrNextImprovement(e.target.value)} /></label>)
 )}{isFieldPresented('sessionReview.overall',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="sessionReview.overall" className={invalidClass('sessionReview.overall')}>{fieldText['sessionReview.overall']?.label?.trim()||'Overall session assessment'} <small>{requirementLabel('sessionReview.overall',requirementOverrides)}</small>{fieldText['sessionReview.overall']?.help&&<small title={fieldText['sessionReview.overall'].help}>ⓘ</small>}<select value={srOverall} onChange={e=>setSrOverall(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label>}</div><details open={['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning','sessionReview.planQuality','sessionReview.discipline'].some(id=>isUserRequired(id,requirementOverrides)||validationErrors.includes(id))}><summary>Detailed daily review · optional unless marked Required</summary><div className="formGrid">{orderFieldIdsWithinSection(['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'],fieldOrder).map(id=>
  isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&(
    id==='sessionReview.wentPoorly'?<label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.wentPoorly']?.label?.trim()||'What went poorly?'} <small>{requirementLabel('sessionReview.wentPoorly',requirementOverrides)}</small>{fieldText['sessionReview.wentPoorly']?.help&&<small title={fieldText['sessionReview.wentPoorly'].help}>ⓘ</small>}<textarea value={srWentPoorly} onChange={e=>setSrWentPoorly(e.target.value)} /></label>:
    id==='sessionReview.bestDecision'?<label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.bestDecision']?.label?.trim()||'Best decision'} <small>{requirementLabel('sessionReview.bestDecision',requirementOverrides)}</small>{fieldText['sessionReview.bestDecision']?.help&&<small title={fieldText['sessionReview.bestDecision'].help}>ⓘ</small>}<textarea value={srBestDecision} onChange={e=>setSrBestDecision(e.target.value)} /></label>:
    id==='sessionReview.biggestMistake'?<label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.biggestMistake']?.label?.trim()||'Biggest mistake'} <small>{requirementLabel('sessionReview.biggestMistake',requirementOverrides)}</small>{fieldText['sessionReview.biggestMistake']?.help&&<small title={fieldText['sessionReview.biggestMistake'].help}>ⓘ</small>}<textarea value={srBiggestMistake} onChange={e=>setSrBiggestMistake(e.target.value)} /></label>:
    <label key={id} data-validation-id={id} className={invalidClass(id)}>{fieldText['sessionReview.marketLearning']?.label?.trim()||'What did the market teach me?'} <small>{requirementLabel('sessionReview.marketLearning',requirementOverrides)}</small>{fieldText['sessionReview.marketLearning']?.help&&<small title={fieldText['sessionReview.marketLearning'].help}>ⓘ</small>}<textarea value={srMarketLearning} onChange={e=>setSrMarketLearning(e.target.value)} /></label>
  )
 )}{isFieldPresented('sessionReview.planQuality',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="sessionReview.planQuality" className={invalidClass('sessionReview.planQuality')}>{fieldText['sessionReview.planQuality']?.label?.trim()||'Plan quality'} <small>{requirementLabel('sessionReview.planQuality',requirementOverrides)}</small>{fieldText['sessionReview.planQuality']?.help&&<small title={fieldText['sessionReview.planQuality'].help}>ⓘ</small>}<select value={srPlanQuality} onChange={e=>setSrPlanQuality(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label>}{isFieldPresented('sessionReview.discipline',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="sessionReview.discipline" className={invalidClass('sessionReview.discipline')}>{fieldText['sessionReview.discipline']?.label?.trim()||'Discipline'} <small>{requirementLabel('sessionReview.discipline',requirementOverrides)}</small>{fieldText['sessionReview.discipline']?.help&&<small title={fieldText['sessionReview.discipline'].help}>ⓘ</small>}<select value={srDiscipline} onChange={e=>setSrDiscipline(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label>}</div></details><div className="rowActions"><button disabled={sessionReviewSaving} aria-busy={sessionReviewSaving} onClick={()=>saveSessionReview(false)}>{sessionReviewSaving?'Saving…':'Save draft'}</button><button className="primary" disabled={sessionReviewSaving||(sessionReviewSummary?.open_trade_count??0)>0} aria-busy={sessionReviewSaving} onClick={()=>saveSessionReview(true)}>{sessionReviewSaving?'Saving…':'Complete & close session'}</button><span role="status" aria-live="polite">{sessionReviewFeedback}</span></div>{(sessionReviewSummary?.open_trade_count??0)>0&&<p className="subtle">Close or resolve open trades before completing the session.</p>}</>}</>}</div>

          <div className="panel"><h2>Plan history</h2><div className="timeline">{timeline.length===0?<p className="subtle">No events yet.</p>:timeline.map((e,i)=><div className="timelineRow" key={`${e.occurred_at}-${i}`}><time>{timeLabel(e.occurred_at)}</time><div><strong>{e.title}</strong>{e.detail&&<p>{e.detail}</p>}<small>{e.event_type}</small></div></div>)}</div></div>
          </div>
        </>}
        </>}
      </section>

      {!showAnalysis&&!showRoadmap&&<aside className="currentPanel"><strong>CURRENT PLAN</strong>{plan?<><span>{plan.initial_bias} · Rev {plan.revision_number}</span>{longZones.length>0&&<div className="miniGroup"><b>BUY</b>{longZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}{shortZones.length>0&&<div className="miniGroup"><b>SHORT</b>{shortZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}{conditionalZones.length>0&&<div className="miniGroup"><b>CONDITIONAL / WATCH</b>{conditionalZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}<small>Updated {timeLabel(plan.created_at)}</small></>:<span>No confirmed plan</span>}</aside>}
    </div>
  </main>;
}


function AnalyticsPanel({filter,patchFilter,apply,rows,summary,mistakes,sources,evidenceTypes,openTrade}:{filter:JournalFilter;patchFilter:(p:Partial<JournalFilter>)=>void;apply:()=>void;rows:JournalTradeRow[];summary:AnalyticsSummary|null;mistakes:MistakeSummary[];sources:LevelSourceType[];evidenceTypes:EvidenceType[];openTrade:(id:string)=>void}){
  const [exportMessage,setExportMessage]=useState('');
  const fmt=(v:number|null|undefined,d=2)=>v==null?'—':v.toFixed(d);
  return <><div className="panel"><div className="panelTitle"><div><h2>Analyze</h2><p className="subtle">Separate from live trading. Filters use structured journal data only.</p></div><div className="headerActions"><button onClick={async()=>{try{const r=await localApi.exportJournalHtml(filter);setExportMessage(`Readable report saved: ${r.path}`)}catch(e){setExportMessage(String(e))}}}>Readable report</button><button onClick={async()=>{try{const r=await localApi.exportJournalCsv(filter);setExportMessage(`CSV saved: ${r.path}`)}catch(e){setExportMessage(String(e))}}}>CSV</button><button onClick={async()=>{try{await localApi.openExportFolder()}catch(e){setExportMessage(`Could not open export folder: ${String(e)}`)}}}>Open export folder</button><button className="primary" onClick={apply}>Apply filters</button></div></div>{exportMessage&&<p className="subtle exportMessage">{exportMessage}</p>}<div className="formGrid"><label>From<input type="date" value={filter.date_from??''} onChange={e=>patchFilter({date_from:e.target.value||null})}/></label><label>To<input type="date" value={filter.date_to??''} onChange={e=>patchFilter({date_to:e.target.value||null})}/></label><label>Instrument<select value={filter.instrument_symbol??''} onChange={e=>patchFilter({instrument_symbol:e.target.value||null})}><option value="">All</option>{Array.from(new Set(rows.map(r=>r.instrument_symbol))).sort().map(x=><option key={x}>{x}</option>)}</select></label><label>Direction<select value={filter.direction??''} onChange={e=>patchFilter({direction:e.target.value||null})}><option value="">All</option><option>LONG</option><option>SHORT</option></select></label><label>Decision quality<select value={filter.decision_quality??''} onChange={e=>patchFilter({decision_quality:e.target.value||null})}><option value="">All</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label><label>Rule status<select value={filter.rule_status??''} onChange={e=>patchFilter({rule_status:(e.target.value||null) as any})}><option value="">All</option><option value="FOLLOWED">No violation recorded</option><option value="VIOLATED">Violation</option><option value="UNCHECKED">Unchecked</option></select></label><label>Level source<select value={filter.level_source_type_id??''} onChange={e=>patchFilter({level_source_type_id:e.target.value||null})}><option value="">All</option>{sources.map(x=><option value={x.source_type_id} key={x.source_type_id}>{x.label}</option>)}</select></label><label>Evidence<select value={filter.evidence_type_id??''} onChange={e=>patchFilter({evidence_type_id:e.target.value||null})}><option value="">All</option>{evidenceTypes.map(x=><option value={x.evidence_type_id} key={x.evidence_type_id}>{x.label}</option>)}</select></label></div></div>
  {summary&&<div className="panel"><div className="panelTitle"><div><h2>Performance summary</h2><p className="subtle">Metrics use only trades with sufficient data for each calculation.</p></div></div><p className="subtle">Cost integrity: historical fills may have unknown commission/fees. The current R calculation treats missing cost values as zero; these summary values may be optimistic until each fill is reconciled. Inspect Execution timeline for cost completeness.</p>{summary.small_sample&&<div className="warningBox">Small sample: only {summary.eligible_r_count} trade(s) have valid R. Interpret results cautiously.</div>}<div className="summaryStrip"><span><b>N</b>{summary.trade_count}</span><span><b>R-eligible</b>{summary.eligible_r_count}</span><span><b>Win rate</b>{summary.win_rate==null?'—':`${fmt(summary.win_rate,1)}%`}</span><span><b>Avg R</b>{fmt(summary.average_r)}R</span><span><b>Net R</b>{fmt(summary.net_r)}R</span><span><b>Expectancy</b>{fmt(summary.expectancy_r)}R</span><span><b>Profit factor</b>{fmt(summary.profit_factor_r)}</span><span><b>Net P&L</b>{summary.net_pnl==null?'—':`$${fmt(summary.net_pnl)}`}</span></div><div className="summaryStrip"><span><b>Avg winner</b>{fmt(summary.average_winner_r)}R</span><span><b>Avg loser</b>{fmt(summary.average_loser_r)}R</span><span><b>Median R</b>{fmt(summary.median_r)}R</span><span><b>Rule violation trades</b>{summary.rule_violation_trades}</span><span className={summary.bad_decision_win_count>0?'warningCell':''}><b>Bad decision + win</b>{summary.bad_decision_win_count}</span></div></div>}
  <div className="panel"><div className="panelTitle"><div><h2>Trade journal</h2><p className="subtle">Click a row to open the underlying trade. Analysis never edits historical records.</p></div></div>{rows.length===0?<p className="subtle">No trades match the current filters.</p>:<div className="tradeList">{rows.map(r=><button className="tradeRow analyticsRow" key={r.trade_id} onClick={()=>openTrade(r.trade_id)}><b>{r.session_date} · {r.instrument_symbol} · {r.direction}</b><span>{r.candidate_label||'Unplanned / unlabeled'}</span><span>{r.decision_quality?`DQ ${r.decision_quality}`:'DQ —'} · {r.rule_status}</span><span>{r.level_sources.slice(0,3).join(' · ')||'No level source'}</span><span>{r.realized_r==null?'R —':`${r.realized_r.toFixed(2)}R`}</span></button>)}</div>}</div>
  {mistakes.length>0&&<div className="panel"><h2>Most frequent mistakes</h2><div className="tradeList">{mistakes.slice(0,8).map(m=><div className="tradeRow" key={m.mistake_type_id}><b>{m.label}</b><span>{m.count}</span></div>)}</div></div>}
  </>;
}

function SafetyPanel({readiness,selfTest,selfTestBusy,onSelfTest,onRefresh,onBackup,backupBusy}:{readiness:RuntimeReadiness;selfTest:BetaSelfTestResult|null;selfTestBusy:boolean;onSelfTest:()=>Promise<void>;onRefresh:()=>Promise<void>;onBackup:()=>Promise<void>;backupBusy:boolean}){
  const [validation,setValidation]=useState('');
  const [validating,setValidating]=useState(false);
  async function validateSelectedBackup(){
    const selected=await open({title:'Select Trading Journal backup to validate (read-only)',multiple:false,filters:[{name:'Journal backup',extensions:['zip']}]});
    if(!selected||typeof selected!=='string')return;
    setValidating(true);setValidation('Checking backup integrity…');
    try{const info=await localApi.validateBackup(selected);setValidation(`Backup valid · ${info.created_at_utc} · database schema ${info.schema_version} · ${info.attachment_count} attachment(s). No data restored.`)}
    catch(e){setValidation(`Backup validation failed: ${String(e)}`)}finally{setValidating(false)}
  }
  const fmtBytes=(n:number)=>n<1024?`${n} B`:n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
  const backupAge=readiness.latest_backup_age_hours==null?'No backup':readiness.latest_backup_age_hours<1?'< 1 hour':`${readiness.latest_backup_age_hours.toFixed(1)} h ago`;
  return <div className="panel safetyPanel"><div className="panelTitle"><div><h2>Local Safety Check</h2><p className="subtle">Fast health check for the personal desktop journal. It does not add trading steps.</p></div><div className="headerActions"><button onClick={onRefresh}>Refresh</button><button disabled={selfTestBusy} onClick={onSelfTest}>{selfTestBusy?'Testing…':'Run beta self-test'}</button><button className="primary" onClick={onBackup} disabled={backupBusy}>{backupBusy?'Creating backup…':'Create backup'}</button></div></div>
    <div className="summaryStrip"><span className={readiness.integrity==='ok'?'okCell':'warningCell'}><b>Database</b>{readiness.integrity==='ok'?'OK':readiness.integrity}</span><span className={readiness.foreign_key_violations===0?'okCell':'warningCell'}><b>Relations</b>{readiness.foreign_key_violations===0?'OK':`${readiness.foreign_key_violations} issue(s)`}</span><span><b>Schema</b>v{readiness.schema_version}</span><span><b>DB size</b>{fmtBytes(readiness.database_size_bytes)}</span><span><b>Attachments</b>{readiness.attachment_file_count}</span><span className={readiness.backup_count>0?'okCell':'warningCell'}><b>Backup</b>{backupAge}</span></div>
    <div className={readiness.ready_for_live_data?'okBox':'warningBox'}>{readiness.ready_for_live_data?'Ready for local journal data.':'Not yet cleared for real-money journal data. No trading action is blocked, but fix the items below first.'}</div>
    {readiness.warnings.length>0&&<ul className="safetyWarnings">{readiness.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    {selfTest&&<div className={selfTest.passed?'okBox':'warningBox'}><strong>{selfTest.passed?'Isolated beta self-test passed.':'Beta self-test failed.'}</strong><div className="selfTestSteps">{selfTest.steps.map((x,i)=><div key={`${i}-${x}`}>{x}</div>)}</div><small>Runs only in a temporary folder; it does not modify the live journal.</small></div>}
    <div className="panel"><h3>Validate existing backup</h3><p className="subtle">Read-only integrity check. This does not replace or modify your journal. Restore is not available from this screen.</p><button disabled={validating} onClick={validateSelectedBackup}>{validating?"Validating…":"Select ZIP and validate backup"}</button>{validation&&<p role="status" aria-live="polite">{validation}</p>}</div>
    <details><summary>Storage paths</summary><div className="pathList"><code>{readiness.database_path}</code><code>{readiness.attachments_path}</code><code>{readiness.backups_path}</code><code>{readiness.exports_path}</code></div></details>
  </div>;
}

function FieldHelp({id,value}:{id:string;value?:string|null}){
  const def=FIELD_DEFINITION_BY_ID[id];
  const [open,setOpen]=useState(false);
  if(!def)return null;
  const optionText=value?def.optionHelp?.[value]:undefined;
  return <span className="fieldHelpWrap">
    <button type="button" className="fieldHelpButton" aria-label={`Help for ${def.label}`} aria-expanded={open} title={def.helpShort} onClick={e=>{e.preventDefault();e.stopPropagation();setOpen(v=>!v)}}>?</button>
    {open&&<span className="fieldHelpPopover" role="dialog" aria-label={`${def.label} help`} onClick={e=>e.stopPropagation()}>
      <span className="fieldHelpHead"><b>{def.label}</b><button type="button" aria-label="Close help" onClick={()=>setOpen(false)}>×</button></span>
      <span>{def.helpShort}</span>
      {optionText&&<span className="fieldHelpOption"><b>{value?.replaceAll('_',' ')}</b> — {optionText}</span>}
      <span className="fieldHelpExample"><b>Example:</b> {def.helpExample}</span>
      {def.helpLong&&<details><summary>Learn more</summary><span>{def.helpLong}</span></details>}
    </span>}
  </span>;
}

function RequirementBadge({id,overrides}:{id:string;overrides:RequirementOverrides}){
  const label=requirementLabel(id,overrides);
  return <small className={label==='Optional'?'reqBadge optional':label==='Conditional'?'reqBadge conditional':'reqBadge required'}>{label}</small>;
}

function AppearanceManager({onClose,onInstruments,onSources,onRequirements,value,onSave}:{onClose:()=>void;onInstruments:()=>void;onSources:()=>void;onRequirements:()=>void;value:AppearancePreferences;onSave:(next:AppearancePreferences)=>Promise<void>}){
  const [draft,setDraft]=useState<AppearancePreferences>(value);
  const [msg,setMsg]=useState('');
  useEffect(()=>setDraft(value),[value]);

  async function patch<K extends keyof AppearancePreferences>(key:K,next:AppearancePreferences[K]){
    const updated={...draft,[key]:next};
    setDraft(updated);
    try{await onSave(updated);setMsg('Saved.');}catch(e){setMsg(String(e));}
  }
  async function reset(){
    setDraft(DEFAULT_APPEARANCE);
    try{await onSave(DEFAULT_APPEARANCE);setMsg('Appearance reset to defaults.');}catch(e){setMsg(String(e));}
  }

  return <div className="guideOverlay" onClick={onClose}><div className="guideCard sourceManagerCard appearanceManagerCard" onClick={e=>e.stopPropagation()}>
    <div className="panelTitle"><div><h2>Appearance</h2><p className="subtle">Comfort and readability only. These settings never change journal data.</p></div><div className="headerActions"><button onClick={onInstruments}>Instruments</button><button onClick={onSources}>Level sources</button><button onClick={onRequirements}>Field requirements</button><button onClick={onClose}>Close</button></div></div>
    {msg&&<p className="subtle">{msg}</p>}
    <div className="appearanceGrid">
      <section className="appearanceGroup"><h3>Theme</h3><p className="subtle">System follows Windows light/dark mode.</p><div className="appearanceChoices">{(['SYSTEM','LIGHT','DARK'] as const).map(x=><button key={x} className={draft.theme===x?'selectedButton':''} onClick={()=>patch('theme',x)}>{x[0]+x.slice(1).toLowerCase()}</button>)}</div></section>
      <section className="appearanceGroup"><h3>Font size</h3><div className="appearanceChoices">{(['COMPACT','DEFAULT','LARGE'] as const).map(x=><button key={x} className={draft.fontSize===x?'selectedButton':''} onClick={()=>patch('fontSize',x)}>{x==='DEFAULT'?'Default':x[0]+x.slice(1).toLowerCase()}</button>)}</div></section>
      <section className="appearanceGroup"><h3>Font family</h3><div className="appearanceChoices">{(['SYSTEM','SEGOE','SERIF'] as const).map(x=><button key={x} className={draft.fontFamily===x?'selectedButton':''} onClick={()=>patch('fontFamily',x)}>{x==='SEGOE'?'Segoe UI':x[0]+x.slice(1).toLowerCase()}</button>)}</div></section>
      <section className="appearanceGroup"><h3>Background tone</h3><div className="appearanceChoices">{(['NEUTRAL','COOL','WARM'] as const).map(x=><button key={x} className={draft.backgroundTone===x?'selectedButton':''} onClick={()=>patch('backgroundTone',x)}>{x[0]+x.slice(1).toLowerCase()}</button>)}</div></section>
    </div>
    <div className="appearancePreview"><b>Live preview</b><span>Readable text, form controls, panels and validation highlights update immediately.</span><label>Example field<input value="Sample journal text" readOnly/></label></div>
    <div className="rowActions"><button onClick={reset}>Reset appearance</button></div>
  </div></div>;
}

function focusRequiredCustomField(fieldId:string,ownerStage:CustomFieldOwnerStage,ownerId:string){
  // Required values are checked against the canonical owner, including post-trade-review.
  // The correct Quick notebook page must be visible before an editor can receive focus.
  const targetId=customFieldFocusId(ownerStage,ownerId,fieldId);
  function focusWhenReady(attempt:number){
    const target=document.getElementById(targetId);
    if(!target){
      if(attempt<12)window.setTimeout(()=>focusWhenReady(attempt+1),100);
      return;
    }
    const disclosure=target.closest('details');
    if(disclosure&&!disclosure.open && disclosure.getClientRects().length>0)disclosure.open=true;
    if(target.getClientRects().length===0){
      if(attempt<12)window.setTimeout(()=>focusWhenReady(attempt+1),100);
      return;
    }
    target.scrollIntoView({behavior:'smooth',block:'center'});
    target.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')?.focus({preventScroll:true});
  }
  focusWhenReady(0);
}
function OwnerCustomSelections({ownerId,ownerStage,quickMode,validationErrors,onSaved}:{ownerId:string;ownerStage:CustomFieldOwnerStage;quickMode:boolean;validationErrors:readonly string[];onSaved:(id:string)=>void}){
  const [fields,setFields]=useState<import('./services/localApi').CustomFieldDefinition[]>([]);
  const [options,setOptions]=useState<Record<string,import('./services/localApi').CustomFieldOption[]>>({});
  const [selected,setSelected]=useState<Record<string,string[]>>({});
  const [notice,setNotice]=useState('');
  const [original,setOriginal]=useState<Record<string,string[]>>({});
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [fieldFeedback,setFieldFeedback]=useState<Record<string,string>>({});
  const [localErrors,setLocalErrors]=useState<string[]>([]);
  useEffect(()=>{
    let live=true;
    setFields([]);setOptions({});setSelected({});setOriginal({});setNotice('');setFieldFeedback({});setLocalErrors([]);
    localApi.listCustomFieldDefinitions().then(async defs=>{
      const eligible=eligibleCustomFields(defs,ownerStage,'select');
      const pairs=await Promise.all(eligible.map(async f=>{
        const [opts,current]=await Promise.all([localApi.listCustomFieldOptions(f.field_id),localApi.currentCustomFieldSelection(ownerStage,ownerId,f.field_id)]);
        return {id:f.field_id,opts,value:current?.options.map(o=>o.option_id)||[]};
      }));
      if(live){setFields(eligible);setOptions(Object.fromEntries(pairs.map(p=>[p.id,p.opts])));setSelected(Object.fromEntries(pairs.map(p=>[p.id,p.value])));setOriginal(Object.fromEntries(pairs.map(p=>[p.id,p.value])));}
    }).catch(e=>{if(live)setNotice('Custom fields unavailable: '+String(e));});
    return ()=>{live=false;};
  },[ownerId,ownerStage]);
  async function save(fieldId:string){
    if(busyRef.current)return;
    const values=selected[fieldId]||[];
    const available=options[fieldId]||[];
    if(values.length===0||values.length>100||!values.every(id=>available.some(o=>o.option_id===id&&o.active))){
      setLocalErrors(v=>v.includes(fieldId)?v:[...v,fieldId]);
      setFieldFeedback(v=>({...v,[fieldId]:'Select at least one active option before saving.'}));
      return;
    }
    if(values.length===(original[fieldId]||[]).length&&values.every(v=>(original[fieldId]||[]).includes(v))){setFieldFeedback(v=>({...v,[fieldId]:'No change to save.'}));return;}
    busyRef.current=true;setBusy(true);setFieldFeedback(v=>({...v,[fieldId]:'Saving selection…'}));
    try {
      await localApi.recordCustomFieldSelection({event_id:crypto.randomUUID(),field_id:fieldId,owner_stage:ownerStage,owner_id:ownerId,option_ids:values});
      setOriginal(v=>({...v,[fieldId]:values}));
      onSaved(customFieldFocusId(ownerStage,ownerId,fieldId));
      setLocalErrors(v=>v.filter(x=>x!==fieldId));
      setFieldFeedback(v=>({...v,[fieldId]:'Selection saved.'}));
      try{const current=await localApi.currentCustomFieldSelection(ownerStage,ownerId,fieldId);setNotice('Saved: '+(current?.options.map(o=>o.label_at_selection).join(', ')||''));}
      catch(e){setNotice('Selection saved, but could not refresh display: '+String(e));}
    }catch(e){setNotice('Not saved: '+String(e));setFieldFeedback(v=>({...v,[fieldId]:'Selection not confirmed. Check the saved field before retrying.'}));}
    finally{busyRef.current=false;setBusy(false);}
  }
  if(!fields.length&&!notice)return null;
  const missing=fields.filter(f=>f.required&&(original[f.field_id]||[]).length===0);
  return <details className="guidedMore" open={(quickMode&&missing.length>0)||fields.some(f=>validationErrors.includes(customFieldFocusId(ownerStage,ownerId,f.field_id)))}><summary>{ownerStage==='post-trade-review'?'Post-trade review':ownerStage==='trade'?'Trade':ownerStage==='candidate'?'Candidate':ownerStage==='zone'?'Zone':ownerStage==='premarket-plan'?'Pre-market plan':'Session'} custom fields {missing.length>0?`· ${missing.length} required missing`:''}</summary>
    <p className="subtle">Save required choices before completing this stage. Unsaved changes do not count as completed.</p>
    {missing.length>0&&<div role="status" className="subtle">Required, not saved: {missing.map(f=><button type="button" key={f.field_id} onClick={()=>focusRequiredCustomField(f.field_id,ownerStage,ownerId)}>{f.label}</button>)}</div>}
    {fields.map(field=>{
      const values=selected[field.field_id]||[];
      const available=options[field.field_id]||[];
      const same=values.length===(original[field.field_id]||[]).length&&values.every(v=>(original[field.field_id]||[]).includes(v));
      const valid=!same&&values.length>0&&values.length<=100&&values.every(id=>available.some(o=>o.option_id===id&&o.active));
      return <div id={customFieldFocusId(ownerStage,ownerId,field.field_id)} key={field.field_id} className={'requirementGroup '+(validationErrors.includes(customFieldFocusId(ownerStage,ownerId,field.field_id))||localErrors.includes(field.field_id)?'validationFieldError':'')}>
        <b>{field.label}{field.required?' · Required':''}</b>{field.help_text&&<p className="subtle">{field.help_text}</p>}
        {field.field_type==='SINGLE_SELECT'
          ? <select aria-label={field.label} value={values[0]||''} onChange={e=>{setSelected(v=>({...v,[field.field_id]:e.target.value?[e.target.value]:[]}));setLocalErrors(v=>v.filter(x=>x!==field.field_id));setFieldFeedback(v=>({...v,[field.field_id]:''}));}}>
            <option value="">Select an option</option>
            {available.filter(o=>o.active||values.includes(o.option_id)).map(o=><option value={o.option_id} key={o.option_id}>{o.label}{o.active?'':' (inactive)'}</option>)}
          </select>
          : <div>{available.filter(o=>o.active||values.includes(o.option_id)).map(o=><label key={o.option_id}>
            <input type="checkbox" checked={values.includes(o.option_id)} disabled={!o.active&&!values.includes(o.option_id)}
              onChange={e=>{setSelected(v=>({...v,[field.field_id]:e.target.checked?[...values,o.option_id]:values.filter(id=>id!==o.option_id)}));setLocalErrors(v=>v.filter(x=>x!==field.field_id));setFieldFeedback(v=>({...v,[field.field_id]:''}));}}/>
            {o.label}{o.active?'':' (inactive)'}
          </label>)}</div>}
        <button type="button" disabled={busy||(same&&values.length>0)||(!valid&&values.length>0)} aria-busy={busy} onClick={()=>save(field.field_id)}>{busy?'Saving…':'Save selection'}</button>
        {fieldFeedback[field.field_id]&&<small role="status" aria-live="polite">{fieldFeedback[field.field_id]}</small>}
      </div>;
    })}
    {notice&&<p role="status" className="subtle">{notice}</p>}
  </details>;
}


function OwnerTypedCustomFields({ownerId,ownerStage,quickMode,validationErrors,onSaved}:{ownerId:string;ownerStage:CustomFieldOwnerStage;quickMode:boolean;validationErrors:readonly string[];onSaved:(id:string)=>void}){
  const [fields,setFields]=useState<import('./services/localApi').CustomFieldDefinition[]>([]);
  const [values,setValues]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [localErrors,setLocalErrors]=useState<string[]>([]);
  const [fieldFeedback,setFieldFeedback]=useState<Record<string,string>>({});
  const [original,setOriginal]=useState<Record<string,string>>({});
  useEffect(()=>{
    let current=true;
    setFields([]);setValues({});setOriginal({});setMessage('');setLocalErrors([]);setFieldFeedback({});
    localApi.listCustomFieldDefinitions().then(async all=>{
      const eligible=eligibleCustomFields(all,ownerStage,'typed');
      const entries=await Promise.all(eligible.map(async f=>{
        const value=await localApi.currentCustomFieldTypedValue(ownerStage,ownerId,f.field_id);
        const display=value?.value_type==='BOOLEAN' ? (value.boolean_value===true?'true':value.boolean_value===false?'false':'') :
          value?.value_type==='NUMBER' ? (value.number_value==null?'':String(value.number_value)) :
          value?.value_type==='DATE' ? (value.date_value||'') : (value?.text_value||'');
        return [f.field_id,display] as const;
      }));
      if(current){setFields(eligible);setValues(Object.fromEntries(entries));setOriginal(Object.fromEntries(entries));}
    }).catch(e=>{if(current)setMessage('Typed fields unavailable: '+String(e));});
    return ()=>{current=false;};
  },[ownerId,ownerStage]);
  async function save(field:import('./services/localApi').CustomFieldDefinition){
    if(busyRef.current)return;
    const raw=values[field.field_id]??'';
    if(raw===original[field.field_id]&&raw.trim()){setFieldFeedback(v=>({...v,[field.field_id]:'No change to save.'}));return;}
    const number=field.field_type==='NUMBER'?Number(raw):null;
    if(!raw.trim()||(field.field_type==='NUMBER'&&!Number.isFinite(number))){
      setLocalErrors(v=>v.includes(field.field_id)?v:[...v,field.field_id]);
      setFieldFeedback(v=>({...v,[field.field_id]:'Enter a valid value before saving.'}));
      return;
    }
    busyRef.current=true;setBusy(true);setFieldFeedback(v=>({...v,[field.field_id]:'Saving value…'}));
    try{
      await localApi.recordCustomFieldTypedValue({
        event_id:crypto.randomUUID(),field_id:field.field_id,owner_stage:ownerStage,owner_id:ownerId,
        text_value:field.field_type==='TEXT'?raw:null,
        number_value:field.field_type==='NUMBER'?number:null,
        date_value:field.field_type==='DATE'?raw:null,
        boolean_value:field.field_type==='BOOLEAN'?raw==='true':null
      });
      setOriginal(v=>({...v,[field.field_id]:raw}));
      onSaved(customFieldFocusId(ownerStage,ownerId,field.field_id));
      setLocalErrors(v=>v.filter(x=>x!==field.field_id));
      setFieldFeedback(v=>({...v,[field.field_id]:'Value saved.'}));
      setMessage(field.label+' saved; earlier values remain in history.');
    }catch(e){setMessage('Not saved: '+String(e));setFieldFeedback(v=>({...v,[field.field_id]:'Save not confirmed. Inspect existing values before retrying.'}));}
    finally{busyRef.current=false;setBusy(false);}
  }
  if(!fields.length&&!message)return null;
  const missing=fields.filter(f=>f.required&&!(original[f.field_id]??'').trim());
  return <details className="guidedMore" open={(quickMode&&missing.length>0)||fields.some(f=>validationErrors.includes(customFieldFocusId(ownerStage,ownerId,f.field_id)))}><summary>{ownerStage==='post-trade-review'?'Post-trade review':ownerStage==='trade'?'Trade':ownerStage==='candidate'?'Candidate':ownerStage==='zone'?'Zone':ownerStage==='premarket-plan'?'Pre-market plan':'Session'} custom text, number, date and yes/no {missing.length>0?`· ${missing.length} required missing`:''}</summary>
    <p className="subtle">Save required values before completing this stage. Unsaved changes do not count as completed.</p>
    {missing.length>0&&<div role="status" className="subtle">Required, not saved: {missing.map(f=><button type="button" key={f.field_id} onClick={()=>focusRequiredCustomField(f.field_id,ownerStage,ownerId)}>{f.label}</button>)}</div>}
    {fields.map(f=><div id={customFieldFocusId(ownerStage,ownerId,f.field_id)} className={'requirementGroup '+(validationErrors.includes(customFieldFocusId(ownerStage,ownerId,f.field_id))||localErrors.includes(f.field_id)?'validationFieldError':'')} key={f.field_id}>
      <label>{f.label}{f.required?' · Required':''}
        {f.field_type==='BOOLEAN'
          ?<select value={values[f.field_id]??''} onChange={e=>{setValues(v=>({...v,[f.field_id]:e.target.value}));setLocalErrors(v=>v.filter(x=>x!==f.field_id));setFieldFeedback(v=>({...v,[f.field_id]:''}));}}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select>
          :<input type={f.field_type==='DATE'?'date':f.field_type==='NUMBER'?'number':'text'} value={values[f.field_id]??''} onChange={e=>{setValues(v=>({...v,[f.field_id]:e.target.value}));setLocalErrors(v=>v.filter(x=>x!==f.field_id));setFieldFeedback(v=>({...v,[f.field_id]:''}));}}/>}
      </label>
      {f.help_text&&<p className="subtle">{f.help_text}</p>}
      <button type="button" disabled={busy||((values[f.field_id]??'').trim()!==''&&(values[f.field_id]??'')===(original[f.field_id]??''))} aria-busy={busy} onClick={()=>save(f)}>{busy?'Saving…':'Save value'}</button>
      {fieldFeedback[f.field_id]&&<small role="status" aria-live="polite">{fieldFeedback[f.field_id]}</small>}
    </div>)}
    {message&&<p role="status" className="subtle">{message}</p>}
  </details>;
}

function CustomFieldDiscovery(){
  const [fields,setFields]=useState<import('./services/localApi').CustomFieldDefinition[]>([]);
  const [options,setOptions]=useState<Record<string,import('./services/localApi').CustomFieldOption[]>>({});
  const [notice,setNotice]=useState('Refresh to load definitions. Changes require an existing schema v9 database.');
  const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState('');
  const [showInactive,setShowInactive]=useState(false);
  const [newField,setNewField]=useState({label:'',stage:'session',field_type:'SINGLE_SELECT',help_text:''});
  const [newOption,setNewOption]=useState<Record<string,string>>({});
  const visibleFields=fields.filter(field=>(showInactive||field.active)&&
    [field.label,field.field_id,field.stage,field.field_type].some(value=>value.toLowerCase().includes(filter.toLowerCase().trim())));
  async function refresh(){
    setBusy(true);
    try{setFields(await localApi.listCustomFieldDefinitions());setOptions({});setNotice('Definitions loaded.');}
    catch(e){setFields([]);setOptions({});setNotice('Unavailable: '+String(e));}
    finally{setBusy(false);}
  }
  async function runChange(action:()=>Promise<void>){
    if(busy)return;
    setBusy(true);
    try{await action();setFields(await localApi.listCustomFieldDefinitions());setOptions({});setNotice('Saved. Existing historical values were not rewritten.');}
    catch(e){setNotice('Not saved: '+String(e));}
    finally{setBusy(false);}
  }
  function newId(){return crypto.randomUUID();}
  return <details className="guidedMore"><summary>Custom Fields & Options — management (beta)</summary>
    <p className="subtle">Changes affect field definitions and future selections, not old values. Schema v9 is required. Use a DEMO journal for testing this beta.</p>
    <button type="button" disabled={busy} onClick={refresh}>Refresh custom fields</button>
    <p className="subtle" role="status">{notice}</p>
    <div className="requirementGroup">
      <h3>Create custom field</h3>
      <p className="subtle">New fields can be created in six supported stages: Session, Pre-market Plan, Candidate, Zone, Trade and Post-trade Review. Existing definitions for other stages remain visible and retain their history; those stages are not yet available for new capture.</p>
      <label>Label<input value={newField.label} maxLength={240} onChange={e=>setNewField(v=>({...v,label:e.target.value}))}/></label>
      <label>Stage<select value={newField.stage} onChange={e=>setNewField(v=>({...v,stage:e.target.value}))}>{CAPTURABLE_CUSTOM_FIELD_STAGES.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Type<select value={newField.field_type} onChange={e=>setNewField(v=>({...v,field_type:e.target.value}))}>{['TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Help text<input value={newField.help_text} maxLength={240} onChange={e=>setNewField(v=>({...v,help_text:e.target.value}))}/></label>
      <button type="button" disabled={busy||!newField.label.trim()||!canCaptureCustomFieldStage(newField.stage)} onClick={()=>runChange(async()=>{
        if(!canCaptureCustomFieldStage(newField.stage))throw Error('Stage has no supported capture editor');
        await localApi.createCustomFieldDefinition({field_id:newId(),stage:newField.stage,field_type:newField.field_type,label:newField.label,help_text:newField.help_text,required:false,display_order:fields.length});
        setNewField(v=>({...v,label:'',help_text:''}));
      })}>Create field</button>
    </div>
    <label>Search fields<input type="search" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
    <label><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Show inactive</label>
    {visibleFields.map(field=><div className="requirementGroup" key={field.field_id}>
      <b>{field.label}</b> <small>({field.field_type} · {field.stage} · {field.active?'Active':'Inactive'})</small>
      <p className="subtle">ID: {field.field_id} · {field.help_text||'No help text'} · {field.required?'Required':'Optional'}{!canCaptureCustomFieldStage(field.stage)?' · No capture editor for this legacy stage; cannot newly require it':''}</p>
      <label><input type="checkbox" checked={field.required} disabled={busy||!field.active||(!field.required&&!canCaptureCustomFieldStage(field.stage))} onChange={e=>{if(e.target.checked&&!canCaptureCustomFieldStage(field.stage)){setNotice('Cannot require an unsupported capture stage.');return;}void runChange(()=>localApi.editCustomFieldDefinition(field.field_id,field.label,field.help_text,e.target.checked,field.active,field.display_order));}}/> Required at this stage</label>
      <button type="button" disabled={busy||(!field.active&&field.required&&!canCaptureCustomFieldStage(field.stage))} onClick={()=>runChange(()=>localApi.editCustomFieldDefinition(field.field_id,field.label,field.help_text,field.required,!field.active,field.display_order))}>{field.active?'Deactivate':'Reactivate'}</button>
      <button type="button" disabled={busy} onClick={async()=>{
        if(busy)return;
        setBusy(true);
        try {
          const report=await localApi.customFieldCleanupPreflight(field.field_id);
          const details=`Controlled Cleanup — ${report.label} (${report.stage})\nField ID: ${report.field_id}\nOptions: ${report.option_count}; saved events: ${report.event_count}; selection snapshots: ${report.snapshot_count}`;
          if(!report.eligible_unused_definition){
            setNotice(details+' — BLOCKED: saved history is protected. Deactivate this field instead; test-data history purge is not implemented.');
            return;
          }
          if(!window.confirm(details+'\n\nPERMANENT deletion of this unused field and its options. A safety backup will be created and validated first. Continue?'))return;
          const typed=window.prompt('Final confirmation: type DELETE to permanently delete this unused field and all its options.');
          if(typed!=='DELETE'){setNotice('Cleanup cancelled; DELETE not confirmed.');return;}
          const path=await localApi.cleanupUnusedCustomField(field.field_id,typed);
          setFields(await localApi.listCustomFieldDefinitions());
          setOptions({});
          setNotice('Unused field deleted after verified backup: '+path);
        }catch(e){setNotice('Cleanup not performed: '+String(e));}
        finally{setBusy(false);}
      }}>Controlled cleanup</button>
      <button type="button" disabled={busy} onClick={()=>{
        const label=window.prompt('New field label',field.label);
        if(label!==null&&label.trim())void runChange(()=>localApi.editCustomFieldDefinition(field.field_id,label,field.help_text,field.required,field.active,field.display_order));
      }}>Rename</button>
      {['SINGLE_SELECT','MULTI_SELECT'].includes(field.field_type)&&<>
        <button type="button" disabled={busy} onClick={async()=>{try{const fieldOptions=await localApi.listCustomFieldOptions(field.field_id);setOptions(v=>({...v,[field.field_id]:fieldOptions}));}catch(e){setNotice(String(e));}}}>View options</button>
        <label>New option<input value={newOption[field.field_id]||''} onChange={e=>setNewOption(v=>({...v,[field.field_id]:e.target.value}))}/></label>
        <button type="button" disabled={busy||!field.active||!(newOption[field.field_id]||'').trim()} onClick={()=>runChange(async()=>{await localApi.createCustomFieldOption({option_id:newId(),field_id:field.field_id,label:newOption[field.field_id],display_order:options[field.field_id]?.length||0});setNewOption(v=>({...v,[field.field_id]:''}));})}>Add option</button>
        {options[field.field_id]?.map(option=><p key={option.option_id} className="subtle">
          {option.label} · {option.active?'Active':'Inactive'} · ID: {option.option_id}
          <button type="button" disabled={busy} onClick={()=>runChange(()=>localApi.editCustomFieldOption(field.field_id,option.option_id,option.label,!option.active,option.display_order))}>{option.active?'Deactivate':'Reactivate'}</button>
          <button type="button" disabled={busy} onClick={()=>{const label=window.prompt('New option label',option.label);if(label!==null&&label.trim())void runChange(()=>localApi.editCustomFieldOption(field.field_id,option.option_id,label,option.active,option.display_order));}}>Rename</button>
        </p>)}
      </>}
    </div>)}
  </details>;
}

function FieldRequirementManager({onClose,onInstruments,onSources,onAppearance,overrides,visibility,placements,order,fieldText,onFieldTextChanged,onOrderChanged,onPlacementChanged,onVisibilityChanged,onChanged}:{onClose:()=>void;onInstruments:()=>void;onSources:()=>void;onAppearance:()=>void;overrides:RequirementOverrides;visibility:Record<string,boolean>;placements:Record<string,FieldPlacement>;order:Record<string,number>;fieldText:Record<string,{label?:string;help?:string}>;onFieldTextChanged:()=>Promise<void>;onOrderChanged:()=>Promise<void>;onPlacementChanged:()=>Promise<void>;onVisibilityChanged:()=>Promise<void>;onChanged:()=>Promise<void>}){
  const [draft,setDraft]=useState<RequirementOverrides>(overrides);
  const [msg,setMsg]=useState('');
  const [fieldSearch,setFieldSearch]=useState('');
  const [inventoryFilter,setInventoryFilter]=useState<'ALL'|'EDITABLE'|'PROTECTED'|'OPEN'>('ALL');
  const settingsSaveRef=useRef(false);
  const [settingsSaving,setSettingsSaving]=useState(false);
  async function persistSetting(label:string, write:()=>Promise<unknown>, refresh:()=>Promise<void>):Promise<boolean>{
    if(settingsSaveRef.current){setMsg('A Field Manager change is already being saved.');return false;}
    settingsSaveRef.current=true;setSettingsSaving(true);setMsg('Saving '+label+'…');
    try {
      await write();
      setMsg(label+' saved. Existing journal history is unchanged.');
      try{await refresh();}catch(e){setMsg(label+' saved, but settings display could not refresh: '+String(e));}
      return true;
    }catch(e){
      setMsg(label+' save not confirmed. Reload settings and inspect the current value before retrying: '+String(e));
      return false;
    }finally{settingsSaveRef.current=false;setSettingsSaving(false);}
  }
  const [textDraft,setTextDraft]=useState<Record<string,{label?:string;help?:string}>>(fieldText);
  useEffect(()=>setTextDraft(fieldText),[fieldText]);
  useEffect(()=>setDraft(overrides),[overrides]);

  async function save(next:RequirementOverrides):Promise<boolean>{
    const saved=await persistSetting('Field requirements',()=>localApi.saveFieldRequirementOverrides(next),onChanged);
    if(saved)setDraft(next);
    return saved;
  }
  async function toggle(id:string){
    if(settingsSaveRef.current)return;
    const def=FIELD_DEFINITION_BY_ID[id];
    if(!def||def.systemLocked)return;
    const next={...draft,[id]:!draft[id]};
    if(!next[id])delete next[id];
    await save(next);
  }
  async function reset(){if(settingsSaveRef.current)return;if(await save({}))setMsg('Field requirements reset to lightweight defaults.');}
  function effectivePlacement(id:string):FieldPlacement {
    // Keep the pre-existing Decision quality Quick default (Detailed-only).
    return placements[id]??(id==='decision.quality'?'DETAILED_ONLY':'QUICK_AND_DETAILED');
  }
  async function togglePlacement(id:string){
    if(!isActiveVisibilityControl(id)||isUserRequired(id,draft)||settingsSaveRef.current)return;
    const next:Record<string,FieldPlacement>={...placements,[id]:effectivePlacement(id)==='DETAILED_ONLY'?'QUICK_AND_DETAILED':'DETAILED_ONLY'};
    await persistSetting('Quick/Detailed placement',()=>localApi.saveFieldPlacementPreferences(next),onPlacementChanged);
  }
  async function toggleVisible(id:string){
    if(!isActiveVisibilityControl(id)||isUserRequired(id,draft)||settingsSaveRef.current)return;
    const next={...visibility,[id]:!isFieldShown(id,visibility,draft)};
    await persistSetting('Field visibility',()=>localApi.saveFieldVisibilityPreferences(next),onVisibilityChanged);
  }
  async function saveTextSettings(){
    await persistSetting('Field labels and help',()=>localApi.saveFieldTextPreferences(textDraft),onFieldTextChanged);
  }
  async function moveFieldOrder(id:string,direction:-1|1,section:readonly string[],label:string){
    if(settingsSaveRef.current)return;
    const ids=orderFieldIdsWithinSection([...section],order);
    const at=ids.indexOf(id),target=at+direction;
    if(at<0||target<0||target>=ids.length)return;
    [ids[at],ids[target]]=[ids[target],ids[at]];
    const next={...order,...Object.fromEntries(ids.map((field,index)=>[field,index]))};
    await persistSetting(label,()=>localApi.saveFieldOrderPreferences(next),onOrderChanged);
  }
  async function moveSessionReflection(id:string,direction:-1|1){
    const section=id==='sessionReview.wentWell'||id==='sessionReview.nextImprovement'
      ? ['sessionReview.wentWell','sessionReview.nextImprovement']
      : ['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'];
    await moveFieldOrder(id,direction,section,'Session review order');
  }
  async function movePlanScenario(id:string,direction:-1|1){
    await moveFieldOrder(id,direction,['plan.mainScenario','plan.alternativeScenario'],'Plan scenario order');
  }
  async function moveZoneCondition(id:string,direction:-1|1){
    await moveFieldOrder(id,direction,['candidate.requiredConditions','candidate.invalidationConditions'],'Zone condition order');
  }
  async function moveEvidenceField(id:string,direction:-1|1){
    await moveFieldOrder(id,direction,['evidence.price','evidence.note'],'Evidence field order');
  }
  const groups=['Session','Plan','Candidate','Evidence','Decision','Trade','Review','Psychology','SessionReview','Attachment'] as const;
  const coverageReport=fieldConnectionReport();
  const coverageSummary=fieldConnectionSummary();
  return <div className="guideOverlay" onClick={onClose}><div className="guideCard sourceManagerCard" onClick={e=>e.stopPropagation()}>
    <div className="panelTitle"><div><h2>Field Requirements</h2><p className="subtle">Choose which optional fields must be completed. System and conditional requirements are locked to protect workflow integrity.</p></div><div className="headerActions"><button onClick={onAppearance}>Appearance</button><button onClick={onInstruments}>Instruments</button><button onClick={onSources}>Level sources</button><button onClick={onClose}>Close</button></div></div>
    {msg&&<p role="status" aria-live="polite" className="subtle">{msg}</p>}
    <CustomFieldDiscovery/>
    <details className="guidedMore"><summary>All-input Field Manager · search and configure ({FIELD_CONTROL_INVENTORY.length} inputs)</summary>
      <p className="subtle">Manage connected inputs in one place. Protected fields and unresolved connections remain visible for audit, but cannot be silently changed. Only confirmed settings persist; saved historical field values stay intact.</p>
      <div className="rowActions"><label>Find an input <input type="search" value={fieldSearch} onChange={e=>setFieldSearch(e.target.value)} placeholder="Field, stage or ID"/></label>
        <label>Show <select aria-label="Input coverage filter" value={inventoryFilter} onChange={e=>setInventoryFilter(e.target.value as 'ALL'|'EDITABLE'|'PROTECTED'|'OPEN')}>
          <option value="ALL">All inputs</option><option value="EDITABLE">Connected & editable</option><option value="PROTECTED">Protected</option><option value="OPEN">Unfinished connections</option>
        </select></label></div>
      <div className="requirementGroups">{FIELD_CONTROL_INVENTORY.filter(item=>{
        const status=coverageReport.find(row=>row.id===item.id)?.status??'PENDING';
        const matchesFilter=inventoryFilter==='ALL'||(inventoryFilter==='EDITABLE'&&(status==='CONNECTED'||status==='VISIBILITY_ONLY'))||(inventoryFilter==='PROTECTED'&&status==='PROTECTED')||(inventoryFilter==='OPEN'&&(status==='PENDING'||status==='VISIBILITY_ONLY'));
        return matchesFilter&&(!fieldSearch.trim()||`${item.label} ${item.id} ${item.stage} ${item.category}`.toLowerCase().includes(fieldSearch.trim().toLowerCase()));
      }).map(item=>{
        const status=coverageReport.find(row=>row.id===item.id)?.status??'PENDING';
        const def=item.formalFieldId?FIELD_DEFINITION_BY_ID[item.formalFieldId]:undefined;
        const connected=isActiveVisibilityControl(item.id);
        const optionalRequirement=status==='CONNECTED'&&!!def&&!def.systemLocked&&!item.protectedReason&&def.requirementManaged!==false&&def.defaultRequirement==='OPTIONAL'&&item.candidateForCustomization;
        const required=!!def&&isUserRequired(item.id,draft);
        return <div className="requirementRow" key={item.id}>
          <div><b>{fieldText[item.id]?.label?.trim()||item.label}</b><span>{item.stage} · {item.id}</span><small>{status.replaceAll('_',' ')}{def?.defaultRequirement==='SYSTEM_REQUIRED'?' · System required':def?.defaultRequirement==='CONDITIONAL'?' · Conditional':''}</small></div>
          <div className="requirementControl">
            {optionalRequirement&&<button type="button" disabled={settingsSaving} aria-label={`Toggle required for ${item.label}`} onClick={()=>toggle(item.id)}>{required?'Required by you':'Optional'}</button>}
            {connected&&<button type="button" disabled={settingsSaving||required} aria-label={`Toggle visibility for ${item.label}`} onClick={()=>toggleVisible(item.id)}>{isFieldShown(item.id,visibility,draft)?'Visible':'Hidden'}</button>}
            {connected&&<button type="button" disabled={settingsSaving||required} aria-label={`Toggle Quick placement for ${item.label}`} onClick={()=>togglePlacement(item.id)}>{effectivePlacement(item.id)==='DETAILED_ONLY'?'Detailed only':'Quick + Detailed'}</button>}
            {!optionalRequirement&&!connected&&<small>{status==='PROTECTED'?'Protected':'Connection pending'}</small>}
          </div>
        </div>;
      })}</div>
      <p className="subtle">Connected: {coverageSummary.CONNECTED} · Visibility-only: {coverageSummary.VISIBILITY_ONLY} · Protected: {coverageSummary.PROTECTED} · Pending: {coverageSummary.PENDING}. A connected control does not imply every requirement is accepted.</p>
    </details>
    <details className="guidedMore"><summary>Field ordering, labels and contextual help</summary><p className="subtle">Field visibility, required status and Quick/Detailed placement are managed in the searchable All-inputs panel above. Existing saved values remain unchanged.</p><label>Find a connected field<input type="search" value={fieldSearch} onChange={e=>setFieldSearch(e.target.value)} placeholder="Search by field name or stage"/></label><div className="requirementGroup"><h3>Plan scenario order</h3><p className="subtle">Change the position of the existing main and alternative scenario prompts.</p>{orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='plan.mainScenario'?'Main scenario':'Alternative scenario'}</span><div className="requirementControl"><button disabled={settingsSaving||index===0} onClick={()=>movePlanScenario(id,-1)}>Up</button><button disabled={settingsSaving||index===1} onClick={()=>movePlanScenario(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Zone condition order</h3><p className="subtle">Reorder only the two connected planned-condition prompts.</p>{orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='candidate.requiredConditions'?'Entry conditions':'Abandon conditions'}</span><div className="requirementControl"><button disabled={settingsSaving||index===0} onClick={()=>moveZoneCondition(id,-1)}>Up</button><button disabled={settingsSaving||index===1} onClick={()=>moveZoneCondition(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Live Evidence field order</h3><p className="subtle">Move optional observation details without changing historical Evidence records.</p>{orderFieldIdsWithinSection(['evidence.price','evidence.note'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {FIELD_DEFINITION_BY_ID[id]?.label??id}</span><div className="requirementControl"><button disabled={settingsSaving||index===0} onClick={()=>moveEvidenceField(id,-1)}>Up</button><button disabled={settingsSaving||index===1} onClick={()=>moveEvidenceField(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Session Review field order</h3><p className="subtle">Move the two connected main reflection fields without editing recorded answers. Order persists across restarts.</p>{orderFieldIdsWithinSection(['sessionReview.wentWell','sessionReview.nextImprovement'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='sessionReview.wentWell'?'What went well?':'One thing to improve next session'}</span><div className="requirementControl"><button disabled={settingsSaving||index===0} onClick={()=>moveSessionReflection(id,-1)}>Up</button><button disabled={settingsSaving||index===1} onClick={()=>moveSessionReflection(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Detailed Session Review field order</h3>{orderFieldIdsWithinSection(['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'],order).map((id,index,ids)=><div className="requirementRow" key={id}><span>{index+1}. {FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id}</span><div className="requirementControl"><button disabled={settingsSaving||index===0} onClick={()=>moveSessionReflection(id,-1)}>Up</button><button disabled={settingsSaving||index===ids.length-1} onClick={()=>moveSessionReflection(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Field labels and help</h3><p className="subtle">Optional wording only. Original field IDs and saved answers do not change.</p>{(['sessionReview.wentWell','sessionReview.nextImprovement','sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning','sessionReview.overall','sessionReview.planQuality','sessionReview.discipline','plan.mainScenario','plan.alternativeScenario','planRevision.evidence','candidate.label','evidence.direction','evidence.price','evidence.note','decision.note','decision.quality','trade.plannedTarget','fill.reason','management.reason','rule.note','attachment.caption'] as const).map(id=><div className="requirementRow" key={id}><label>{FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id} — label<input maxLength={100} value={textDraft[id]?.label??''} placeholder={FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id} onChange={e=>setTextDraft(d=>({...d,[id]:{...d[id],label:e.target.value}}))}/></label><label>Help text<input maxLength={240} value={textDraft[id]?.help??''} placeholder="Optional short explanation" onChange={e=>setTextDraft(d=>({...d,[id]:{...d[id],help:e.target.value}}))}/></label></div>)}<button disabled={settingsSaving} aria-busy={settingsSaving} onClick={saveTextSettings}>{settingsSaving?'Saving settings…':'Save labels and help'}</button></div></details>
    <div className="requirementGroups">{groups.map(group=><section className="requirementGroup" key={group}><h3>{group}</h3>
      {FIELD_DEFINITIONS.filter(x=>x.group===group&&x.requirementManaged!==false).map(def=><div className="requirementRow" key={def.id}>
        <div><b>{def.label}</b>{def.conditionalText&&<span>{def.conditionalText}</span>}</div>
        <div className="requirementControl">
          <RequirementBadge id={def.id} overrides={draft}/>
          {def.systemLocked?<button disabled>Locked</button>:<button disabled={settingsSaving} className={draft[def.id]?'selectedButton':''} onClick={()=>toggle(def.id)}>{draft[def.id]?'Required':'Optional'}</button>}
        </div>
      </div>)}
    </section>)}</div>
    <div className="rowActions"><button disabled={settingsSaving} aria-busy={settingsSaving} onClick={reset}>Reset to defaults</button></div>
    <p className="guideTip">These settings affect future saves and edits only. Existing historical records are never invalidated retroactively.</p>
  </div></div>;
}

const INSTRUMENT_MARKET_TYPES = ['FUTURES','STOCK','CFD','FOREX','CRYPTO','OTHER'] as const;

function InstrumentManager({onClose,onSwitch,onRequirements,onAppearance,onChanged}:{onClose:()=>void;onSwitch:()=>void;onRequirements:()=>void;onAppearance:()=>void;onChanged:()=>Promise<void>}){
  const [items,setItems]=useState<Instrument[]>([]);
  const [msg,setMsg]=useState('');
  const [newSymbol,setNewSymbol]=useState('');
  const [newName,setNewName]=useState('');
  const [newTick,setNewTick]=useState<number|null>(null);
  const [newPoint,setNewPoint]=useState<number|null>(null);
  const [newCurrency,setNewCurrency]=useState('USD');
  const [newMarket,setNewMarket]=useState('FUTURES');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editSymbol,setEditSymbol]=useState('');
  const [editName,setEditName]=useState('');
  const [editTick,setEditTick]=useState<number|null>(null);
  const [editPoint,setEditPoint]=useState<number|null>(null);
  const [editCurrency,setEditCurrency]=useState('USD');
  const [editMarket,setEditMarket]=useState('');

  async function load(){try{setItems(await localApi.listAllInstruments());}catch(e){setMsg(String(e));}}
  useEffect(()=>{void load();},[]);

  async function add(){
    if(!newSymbol.trim()||newTick==null||newPoint==null)return;
    try{
      await localApi.createInstrument({symbol:newSymbol.trim(),display_name:newName.trim()||null,tick_size:newTick,point_value:newPoint,currency:newCurrency.trim()||'USD',market_type:newMarket||null});
      setNewSymbol('');setNewName('');setNewTick(null);setNewPoint(null);setNewCurrency('USD');setNewMarket('FUTURES');setMsg('Instrument added.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  function beginEdit(x:Instrument){
    setEditingId(x.instrument_id);setEditSymbol(x.symbol);setEditName(x.display_name||'');setEditTick(x.tick_size);setEditPoint(x.point_value);setEditCurrency(x.currency);setEditMarket(x.market_type||'');
  }

  async function saveEdit(x:Instrument){
    if(!editSymbol.trim()||editTick==null||editPoint==null)return;
    try{
      await localApi.updateInstrument({instrument_id:x.instrument_id,symbol:editSymbol.trim(),display_name:editName.trim()||null,tick_size:editTick,point_value:editPoint,currency:editCurrency.trim()||'USD',market_type:editMarket||null,active:x.active,display_order:x.display_order});
      setEditingId(null);setMsg('Instrument updated. Historical session snapshots were not rewritten.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  async function toggleActive(x:Instrument){
    try{
      await localApi.updateInstrument({instrument_id:x.instrument_id,symbol:x.symbol,display_name:x.display_name??null,tick_size:x.tick_size,point_value:x.point_value,currency:x.currency,market_type:x.market_type??null,active:!x.active,display_order:x.display_order});
      setMsg(x.active?'Instrument deactivated for new sessions. Historical sessions are preserved.':'Instrument activated.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  async function move(id:string,delta:number){
    const i=items.findIndex(x=>x.instrument_id===id);const j=i+delta;
    if(i<0||j<0||j>=items.length)return;
    const next=[...items];[next[i],next[j]]=[next[j],next[i]];
    try{
      const saved=await localApi.reorderInstruments(next.map(x=>x.instrument_id));setItems(saved);setMsg('Instrument order saved.');await onChanged();
    }catch(e){setMsg(String(e));}
  }

  return <div className="guideOverlay" onClick={onClose}><div className="guideCard sourceManagerCard" onClick={e=>e.stopPropagation()}>
    <div className="panelTitle"><div><h2>Instrument Manager</h2><p className="subtle">Active instruments are available for new sessions. Confirmed sessions keep their own historical symbol and contract specification snapshot.</p></div><div className="headerActions"><button onClick={onAppearance}>Appearance</button><button onClick={onRequirements}>Field requirements</button><button onClick={onSwitch}>Level sources</button><button onClick={onClose}>Close</button></div></div>
    <div className="inlineEditor"><h3>Add instrument</h3><div className="formGrid">
      <label>Symbol<input value={newSymbol} onChange={e=>setNewSymbol(e.target.value.toUpperCase())} placeholder="e.g. NQ"/></label>
      <label>Display name<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. E-mini Nasdaq 100"/></label>
      <label>Tick size<input type="number" min="0" step="any" value={newTick??''} onChange={e=>setNewTick(e.target.value?Number(e.target.value):null)}/></label>
      <label>Point value<input type="number" min="0" step="any" value={newPoint??''} onChange={e=>setNewPoint(e.target.value?Number(e.target.value):null)}/></label>
      <label>Currency<input value={newCurrency} onChange={e=>setNewCurrency(e.target.value.toUpperCase())}/></label>
      <label>Market type<select value={newMarket} onChange={e=>setNewMarket(e.target.value)}>{INSTRUMENT_MARKET_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
    </div><div className="rowActions"><button className="primary" disabled={!newSymbol.trim()||newTick==null||newPoint==null} onClick={add}>Add instrument</button></div></div>
    {msg&&<p className="subtle">{msg}</p>}
    <div className="tradeList sourceManagerList">{items.map((x,i)=><div className="tradeRow sourceManagerRow" key={x.instrument_id}>
      {editingId===x.instrument_id?<div className="sourceManagerEdit"><div className="formGrid">
        <label>Symbol<input value={editSymbol} onChange={e=>setEditSymbol(e.target.value.toUpperCase())}/></label>
        <label>Display name<input value={editName} onChange={e=>setEditName(e.target.value)}/></label>
        <label>Tick size<input type="number" min="0" step="any" value={editTick??''} onChange={e=>setEditTick(e.target.value?Number(e.target.value):null)}/></label>
        <label>Point value<input type="number" min="0" step="any" value={editPoint??''} onChange={e=>setEditPoint(e.target.value?Number(e.target.value):null)}/></label>
        <label>Currency<input value={editCurrency} onChange={e=>setEditCurrency(e.target.value.toUpperCase())}/></label>
        <label>Market type<select value={editMarket} onChange={e=>setEditMarket(e.target.value)}><option value="">Unspecified</option>{INSTRUMENT_MARKET_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      </div><div className="rowActions"><button onClick={()=>setEditingId(null)}>Cancel</button><button className="primary" disabled={!editSymbol.trim()||editTick==null||editPoint==null} onClick={()=>saveEdit(x)}>Save</button></div></div>:<>
        <div><b>{x.symbol}{x.display_name?` · ${x.display_name}`:''}</b><small>Tick {x.tick_size} · Point value {x.point_value} {x.currency} · {x.market_type||'Unspecified'} · {x.active?'Active':'Inactive'}</small></div>
        <div className="rowActions"><button disabled={i===0} onClick={()=>move(x.instrument_id,-1)}>↑</button><button disabled={i===items.length-1} onClick={()=>move(x.instrument_id,1)}>↓</button><button onClick={()=>beginEdit(x)}>Edit</button><button onClick={()=>toggleActive(x)}>{x.active?'Deactivate':'Activate'}</button></div>
      </>}
    </div>)}</div>
    <p className="guideTip">Changing a registry instrument affects future sessions only. Existing confirmed sessions keep the symbol, tick size, point value and currency captured when their draft setup was saved.</p>
  </div></div>;
}

const LEVEL_SOURCE_GROUPS = [
  ['PRICE_AUCTION','Price / Auction'],
  ['STRUCTURE','Structure'],
  ['VOLUME','Executed Volume'],
  ['ORDER_BOOK','Order Book'],
  ['HEATMAP','Heatmap'],
  ['CUSTOM','Custom'],
] as const;

function LevelSourceManager({onClose,onSwitch,onRequirements,onAppearance,onChanged}:{onClose:()=>void;onSwitch:()=>void;onRequirements:()=>void;onAppearance:()=>void;onChanged:()=>Promise<void>}){
  const [items,setItems]=useState<LevelSourceType[]>([]);
  const [msg,setMsg]=useState('');
  const [newLabel,setNewLabel]=useState('');
  const [newGroup,setNewGroup]=useState('CUSTOM');
  const [newDescription,setNewDescription]=useState('');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editLabel,setEditLabel]=useState('');
  const [editGroup,setEditGroup]=useState('');
  const [editDescription,setEditDescription]=useState('');

  async function load(){try{setItems(await localApi.listAllLevelSources());}catch(e){setMsg(String(e));}}
  useEffect(()=>{void load();},[]);

  async function add(){
    if(!newLabel.trim())return;
    try{
      await localApi.createLevelSource({label:newLabel.trim(),source_group:newGroup,description:newDescription.trim()||null});
      setNewLabel('');setNewGroup('CUSTOM');setNewDescription('');setMsg('Level source added.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  function beginEdit(x:LevelSourceType){
    setEditingId(x.source_type_id);setEditLabel(x.label);setEditGroup(x.source_group);setEditDescription(x.description||'');setMsg('');
  }

  async function saveEdit(x:LevelSourceType){
    try{
      await localApi.updateLevelSource({
        source_type_id:x.source_type_id,label:editLabel.trim(),source_group:editGroup,
        description:editDescription.trim()||null,active:x.active,display_order:x.display_order
      });
      setEditingId(null);setMsg('Level source updated. Stable source ID preserved.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  async function toggleActive(x:LevelSourceType){
    try{
      await localApi.updateLevelSource({
        source_type_id:x.source_type_id,label:x.label,source_group:x.source_group,
        description:x.description??null,active:!x.active,display_order:x.display_order
      });
      setMsg(x.active?'Level source deactivated. Historical references are preserved.':'Level source activated.');
      await load();await onChanged();
    }catch(e){setMsg(String(e));}
  }

  async function move(id:string,delta:number){
    const i=items.findIndex(x=>x.source_type_id===id);const j=i+delta;
    if(i<0||j<0||j>=items.length)return;
    const next=[...items];[next[i],next[j]]=[next[j],next[i]];
    try{
      const saved=await localApi.reorderLevelSources(next.map(x=>x.source_type_id));
      setItems(saved);setMsg('Display order saved.');await onChanged();
    }catch(e){setMsg(String(e));}
  }

  const groupLabel=(v:string)=>LEVEL_SOURCE_GROUPS.find(x=>x[0]===v)?.[1]??v.replaceAll('_',' ');
  return <div className="guideOverlay" onClick={onClose}><div className="guideCard sourceManagerCard" onClick={e=>e.stopPropagation()}>
    <div className="panelTitle"><div><h2>Level Source Manager</h2><p className="subtle">Controls the provenance choices under “Why is this level important?”. IDs stay stable for analytics and history.</p></div><div className="headerActions"><button onClick={onAppearance}>Appearance</button><button onClick={onRequirements}>Field requirements</button><button onClick={onSwitch}>Instruments</button><button onClick={onClose}>Close</button></div></div>
    <div className="inlineEditor"><h3>Add source</h3><div className="formGrid">
      <label>Name<input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="e.g. Weekly POC"/></label>
      <label>Category<select value={newGroup} onChange={e=>setNewGroup(e.target.value)}>{LEVEL_SOURCE_GROUPS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>Description <small>Optional</small><input value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="Short definition for future reference"/></label>
    </div><div className="rowActions"><button className="primary" disabled={!newLabel.trim()} onClick={add}>Add source</button></div></div>
    {msg&&<p className="subtle">{msg}</p>}
    <div className="tradeList sourceManagerList">{items.map((x,i)=>{
      const protectedSource=x.code==='MANUAL'||x.code==='OTHER';
      return <div className="tradeRow sourceManagerRow" key={x.source_type_id}>
        {editingId===x.source_type_id?<div className="sourceManagerEdit"><div className="formGrid">
          <label>Name<input value={editLabel} onChange={e=>setEditLabel(e.target.value)}/></label>
          <label>Category<select disabled={protectedSource} value={editGroup} onChange={e=>setEditGroup(e.target.value)}>{protectedSource?<option value={x.source_group}>{groupLabel(x.source_group)}</option>:LEVEL_SOURCE_GROUPS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Description<input value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label>
        </div><div className="rowActions"><button onClick={()=>setEditingId(null)}>Cancel</button><button className="primary" disabled={!editLabel.trim()} onClick={()=>saveEdit(x)}>Save</button></div></div>:<>
          <div><b>{x.label}</b><small>{groupLabel(x.source_group)} · {x.user_defined?'Custom source':'Built-in'} · {x.active?'Active':'Inactive'}</small>{x.description&&<span>{x.description}</span>}</div>
          <div className="rowActions"><button disabled={i===0} onClick={()=>move(x.source_type_id,-1)}>↑</button><button disabled={i===items.length-1} onClick={()=>move(x.source_type_id,1)}>↓</button><button onClick={()=>beginEdit(x)}>Edit</button><button disabled={protectedSource} onClick={()=>toggleActive(x)}>{x.active?'Deactivate':'Activate'}</button></div>
        </>}
      </div>;
    })}</div>
    <p className="guideTip">Manual and Other stay active by design. Deactivation affects future pickers only; historical candidate references are not deleted.</p>
  </div></div>;
}

function MiniZone({c}:{c:CurrentCandidate}){
  return <div className="miniZone"><b>{c.label||'Zone'}</b><small>{c.current_status}</small><small>{c.price_mode==='RANGE'?`${c.price_from}–${c.price_to}`:c.reference_price??'No fixed price'}</small></div>;
}

function SourcePicker({grouped,selected,toggle,compact=false}:{grouped:[string,LevelSourceType[]][];selected:string[];toggle:(id:string)=>void;compact?:boolean}){
  return <details key={compact?'compact':'expanded'} open={!compact?true:undefined}><summary>Why does this location matter? <small>Level sources, not live evidence</small> {selected.length>0&&<small>({selected.length} selected)</small>} <FieldHelp id="candidate.sources"/></summary>{grouped.map(([group,items])=><div className="sourceGroup" key={group}><strong>{group.replaceAll('_',' ')}</strong><div className="chips">{items.map(s=><button type="button" className={selected.includes(s.source_type_id)?'chip selected':'chip'} key={s.source_type_id} onClick={()=>toggle(s.source_type_id)}>{s.label}</button>)}</div></div>)}</details>;
}

function CandidateEditor({candidate,patch,groupedSources,selected,toggleSource,tickStep,requirementOverrides,fieldVisibility,fieldPlacements,fieldText,fieldOrder,quickMode,validationPrefix,validationErrors,clearValidation}:{candidate:CandidateDraftInput;patch:(p:Partial<CandidateDraftInput>)=>void;groupedSources:[string,LevelSourceType[]][];selected:string[];toggleSource:(id:string)=>void;tickStep:number;requirementOverrides:RequirementOverrides;fieldVisibility:Record<string,boolean>;fieldPlacements:Record<string,FieldPlacement>;fieldText:Record<string,{label?:string;help?:string}>;fieldOrder:Record<string,number>;quickMode:boolean;validationPrefix:string;validationErrors:string[];clearValidation:(id:string)=>void}){
  const err=(suffix:string)=>validationErrors.includes(`${validationPrefix}.${suffix}`)?'validationFieldError':'';
  const errorText=(suffix:string)=>validationErrors.includes(`${validationPrefix}.${suffix}`)?<small role="alert" className="validationInlineError">Required: enter a valid {suffix==='priceFrom'?'range start price':suffix==='priceTo'?'range end price':'single price'}.</small>:null;
  const clear=(suffix:string)=>clearValidation(`${validationPrefix}.${suffix}`);
  return <><p className="subtle">Where are you watching, what must happen before entry, and what cancels the idea?</p><div className="formGrid">{isFieldPresented('candidate.label',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>{fieldText['candidate.label']?.label?.trim()||'Name this zone (optional)'}{fieldText['candidate.label']?.help&&<small title={fieldText['candidate.label'].help}>ⓘ</small>}<input value={candidate.label??''} onChange={e=>patch({label:e.target.value})} placeholder="e.g. Upper High"/></label>}<label>What are you watching for here? <small>Directional intent</small> <FieldHelp id="candidate.intent" value={candidate.directional_intent}/><select value={candidate.directional_intent} onChange={e=>patch({directional_intent:e.target.value as CandidateDraftInput['directional_intent']})}>{['LONG','SHORT','CONDITIONAL','WATCH','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label><details className="guidedMore"><summary>More details — trend context</summary><label>How does this idea relate to the trend? <small>Role vs trend</small> <FieldHelp id="candidate.trendRelationship" value={candidate.trend_relationship??'UNCLEAR'}/><select value={candidate.trend_relationship??'UNCLEAR'} onChange={e=>patch({trend_relationship:e.target.value as CandidateDraftInput['trend_relationship']})}>{['WITH_TREND','COUNTERTREND','CONTINUATION_AFTER_CORRECTION','REVERSAL','NA','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label></details><label>At what price? <small>Single price, range or not fixed yet</small> <FieldHelp id="candidate.priceMode" value={candidate.price_mode}/><select value={candidate.price_mode} onChange={e=>{patch({price_mode:e.target.value as CandidateDraftInput['price_mode']});clear('price');clear('priceFrom');clear('priceTo')}}><option value="RANGE">Price range</option><option value="SINGLE">Single price</option><option value="UNSPECIFIED">No fixed price yet</option></select></label>{candidate.price_mode==='RANGE'&&<><label data-validation-id={`${validationPrefix}.priceFrom`} className={err('priceFrom')}>From <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.price_from??''} onChange={e=>{patch({price_from:e.target.value?Number(e.target.value):null});clear('priceFrom')}}/>{errorText('priceFrom')}</label><label data-validation-id={`${validationPrefix}.priceTo`} className={err('priceTo')}>To <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.price_to??''} onChange={e=>{patch({price_to:e.target.value?Number(e.target.value):null});clear('priceTo')}}/>{errorText('priceTo')}</label></>}{candidate.price_mode==='SINGLE'&&<label data-validation-id={`${validationPrefix}.price`} className={err('price')}>Price <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.reference_price??''} onChange={e=>{patch({reference_price:e.target.value?Number(e.target.value):null});clear('price')}}/>{errorText('price')}</label>}{isFieldPresented('candidate.requiredConditions',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<details style={{order:10+orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],fieldOrder).indexOf('candidate.requiredConditions')}} className="guidedMore" open={isUserRequired('candidate.requiredConditions',requirementOverrides)||validationErrors.includes(`${validationPrefix}.requiredConditions`)||candidate.required_conditions.some(v=>v.trim())?true:undefined} ><summary>{fieldText['candidate.requiredConditions']?.label?.trim()||'Entry conditions'} {isUserRequired('candidate.requiredConditions',requirementOverrides)?'— Required by you':'— Optional'} {fieldText['candidate.requiredConditions']?.help&&<small title={fieldText['candidate.requiredConditions'].help}>ⓘ</small>}</summary><label data-validation-id={`${validationPrefix}.requiredConditions`} className={err('requiredConditions')}>What must you see before entry? <small>Planned conditions, not observed evidence</small> <RequirementBadge id="candidate.requiredConditions" overrides={requirementOverrides}/> <FieldHelp id="candidate.requiredConditions"/><textarea value={candidate.required_conditions.join('\n')} onChange={e=>{patch({required_conditions:e.currentTarget.value.split(/\r?\n/)});clear('requiredConditions')}} placeholder={isUserRequired('candidate.requiredConditions',requirementOverrides)?'Required by you — one condition per line':'One condition per line'}/></label></details>}{isFieldPresented('candidate.invalidationConditions',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<details style={{order:10+orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],fieldOrder).indexOf('candidate.invalidationConditions')}} className="guidedMore" open={isUserRequired('candidate.invalidationConditions',requirementOverrides)||validationErrors.includes(`${validationPrefix}.invalidationConditions`)||candidate.invalidation_conditions.some(v=>v.trim())?true:undefined} ><summary>{fieldText['candidate.invalidationConditions']?.label?.trim()||'Abandon conditions'} {isUserRequired('candidate.invalidationConditions',requirementOverrides)?'— Required by you':'— Optional'} {fieldText['candidate.invalidationConditions']?.help&&<small title={fieldText['candidate.invalidationConditions'].help}>ⓘ</small>}</summary><label data-validation-id={`${validationPrefix}.invalidationConditions`} className={err('invalidationConditions')}>When would you abandon this idea? <small>Thesis invalidation, not the stop order</small> <RequirementBadge id="candidate.invalidationConditions" overrides={requirementOverrides}/> <FieldHelp id="candidate.invalidationConditions"/><textarea value={candidate.invalidation_conditions.join('\n')} onChange={e=>{patch({invalidation_conditions:e.currentTarget.value.split(/\r?\n/)});clear('invalidationConditions')}} placeholder={isUserRequired('candidate.invalidationConditions',requirementOverrides)?'Required by you — one condition per line':'One condition per line'}/></label></details>}</div>{isFieldPresented('candidate.sources',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<div data-validation-id={`${validationPrefix}.sources`} className={err('sources')}><p className="subtle">{fieldText['candidate.sources']?.label?.trim()||'Level sources'}{isUserRequired('candidate.sources',requirementOverrides)?' — Required by you':''}{fieldText['candidate.sources']?.help&&<small title={fieldText['candidate.sources'].help}> ⓘ</small>}</p><SourcePicker grouped={groupedSources} selected={selected} toggle={id=>{toggleSource(id);clear('sources')}} compact={!isUserRequired('candidate.sources',requirementOverrides)&&!validationErrors.includes(`${validationPrefix}.sources`)}/></div>}</>;
}


function AttachmentPanel({ownerType,ownerId,defaultStage,title,compact=false,quickMode,fieldVisibility,fieldPlacements,requirementOverrides,fieldText}:{ownerType:'SESSION'|'CANDIDATE'|'DECISION'|'TRADE'|'REVIEW';ownerId:string;defaultStage:typeof ATTACHMENT_STAGES[number];title:string;compact?:boolean;quickMode:boolean;fieldVisibility:Record<string,boolean>;fieldPlacements:Record<string,FieldPlacement>;requirementOverrides:RequirementOverrides;fieldText:Record<string,{label?:string;help?:string}>}){
  const [items,setItems]=useState<Attachment[]>([]);
  const [stage,setStage]=useState<typeof ATTACHMENT_STAGES[number]>(defaultStage);
  const [caption,setCaption]=useState('');
  const captionInputRef=useRef<HTMLInputElement>(null);
  const [preview,setPreview]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [lightboxId,setLightboxId]=useState<string|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editStage,setEditStage]=useState<typeof ATTACHMENT_STAGES[number]>('OTHER');
  const [editCaption,setEditCaption]=useState('');
  async function refresh(){try{setItems(await localApi.listAttachments(ownerType,ownerId));}catch(e){setMsg(String(e))}}
  useEffect(()=>{refresh()},[ownerType,ownerId]);
  useEffect(()=>{setStage(defaultStage)},[defaultStage]);
  useEffect(()=>{
    if(!lightboxId)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setLightboxId(null); if(e.key==='ArrowLeft')stepLightbox(-1); if(e.key==='ArrowRight')stepLightbox(1);}
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[lightboxId,items]);
  async function add(){
    // A screenshot has no required caption until the trader actually chooses to add one.
    const captionIssue=attachmentCaptionIssue(requirementOverrides,caption);
    if(captionIssue){
      setMsg('Missing required field: '+captionIssue.label+'.');
      captionInputRef.current?.scrollIntoView({behavior:'smooth',block:'center'});
      captionInputRef.current?.focus({preventScroll:true});
      return;
    }
    try{
      const picked=await open({multiple:false,filters:[{name:'Screenshots',extensions:['png','jpg','jpeg','webp']}]});
      if(!picked||Array.isArray(picked))return;
      setBusy(true);setMsg('');
      await localApi.importAttachment({owner_type:ownerType,owner_id:ownerId,stage,source_path:picked,caption:caption||null});
      setCaption('');await refresh();setMsg('Screenshot saved locally.');
    }catch(e){setMsg(String(e))}finally{setBusy(false)}
  }
  async function ensurePreview(a:Attachment){
    if(preview[a.attachment_id])return preview[a.attachment_id];
    const u=await localApi.attachmentDataUrl(a.attachment_id);setPreview(p=>({...p,[a.attachment_id]:u}));return u;
  }
  async function show(a:Attachment){
    try{await ensurePreview(a);setLightboxId(a.attachment_id)}catch(e){setMsg(String(e))}
  }
  function stepLightbox(delta:number){
    if(!lightboxId||items.length<2)return;
    const i=items.findIndex(x=>x.attachment_id===lightboxId);
    const next=items[(i+delta+items.length)%items.length];
    if(next)void show(next);
  }
  function beginEdit(a:Attachment){
    setEditingId(a.attachment_id);setEditStage(a.stage as typeof ATTACHMENT_STAGES[number]);setEditCaption(a.caption||'');setMsg('');
  }
  async function saveEdit(a:Attachment){
    try{
      setBusy(true);await localApi.updateAttachment({attachment_id:a.attachment_id,stage:editStage,caption:editCaption||null});
      setEditingId(null);await refresh();setMsg('Screenshot details updated.');
    }catch(e){setMsg(String(e))}finally{setBusy(false)}
  }
  async function replaceFile(a:Attachment){
    try{
      const picked=await open({multiple:false,filters:[{name:'Screenshots',extensions:['png','jpg','jpeg','webp']}]});
      if(!picked||Array.isArray(picked))return;
      setBusy(true);await localApi.replaceAttachmentFile({attachment_id:a.attachment_id,source_path:picked});
      setPreview(p=>{const n={...p};delete n[a.attachment_id];return n});await refresh();setMsg('Screenshot file replaced.');
    }catch(e){setMsg(String(e))}finally{setBusy(false)}
  }
  async function remove(a:Attachment){
    if(!window.confirm('Delete this screenshot from the journal and local attachment storage?'))return;
    try{
      setBusy(true);await localApi.deleteAttachment(a.attachment_id);
      setPreview(p=>{const n={...p};delete n[a.attachment_id];return n});if(lightboxId===a.attachment_id)setLightboxId(null);await refresh();setMsg('Screenshot deleted.');
    }catch(e){setMsg(String(e))}finally{setBusy(false)}
  }
  const lightboxItem=items.find(x=>x.attachment_id===lightboxId)??null;
  return <div className={compact?'attachmentBox compact':'panel attachmentBox'}>
    <div className="panelTitle"><div><h3>{title}</h3><p className="subtle">Optional · stored locally and included in full backup.</p></div><button disabled={busy} onClick={add}>{busy?'Saving…':'+ Screenshot'}</button></div>
    <div className="attachmentControls"><label>Stage<select value={stage} onChange={e=>setStage(e.target.value as typeof ATTACHMENT_STAGES[number])}>{ATTACHMENT_STAGES.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>{isFieldPresented("attachment.caption",quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="attachment.caption">{fieldText["attachment.caption"]?.label?.trim()||"Caption"} <small>{requirementLabel("attachment.caption",requirementOverrides)}</small>{fieldText["attachment.caption"]?.help&&<small title={fieldText["attachment.caption"].help}>ⓘ</small>}<input ref={captionInputRef} value={caption} onChange={e=>{setCaption(e.target.value);setMsg("")}} placeholder="Only if useful"/></label>}</div>
    {msg&&<p className="subtle">{msg}</p>}
    {items.length>0&&<div className="attachmentGrid">{items.map(a=><div className="attachmentCard" key={a.attachment_id}>
      {preview[a.attachment_id]?<button className="thumbButton" onClick={()=>show(a)}><img src={preview[a.attachment_id]} alt={a.caption||a.original_filename||'Trading screenshot'}/></button>:<button className="previewButton" onClick={()=>show(a)}>Preview</button>}
      <small>{a.stage.replaceAll('_',' ')} · {a.original_filename||'image'}</small>{a.caption&&<span>{a.caption}</span>}
      {editingId===a.attachment_id?<div className="attachmentEdit"><label>Stage<select value={editStage} onChange={e=>setEditStage(e.target.value as typeof ATTACHMENT_STAGES[number])}>{ATTACHMENT_STAGES.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Caption<input value={editCaption} onChange={e=>setEditCaption(e.target.value)}/></label><div className="attachmentActions"><button onClick={()=>setEditingId(null)}>Cancel</button><button className="primary" disabled={busy} onClick={()=>saveEdit(a)}>Save</button></div></div>:<div className="attachmentActions"><button onClick={()=>show(a)}>Open</button><button onClick={()=>beginEdit(a)}>Edit</button><button disabled={busy} onClick={()=>replaceFile(a)}>Replace</button><button className="dangerButton" disabled={busy} onClick={()=>remove(a)}>Delete</button></div>}
    </div>)}</div>}
    {lightboxItem&&preview[lightboxItem.attachment_id]&&<div className="imageLightbox" onClick={()=>setLightboxId(null)}><div className="imageLightboxCard" onClick={e=>e.stopPropagation()}><div className="imageLightboxHead"><div><b>{lightboxItem.stage.replaceAll('_',' ')}</b><span>{lightboxItem.caption||lightboxItem.original_filename||'Screenshot'}</span></div><button onClick={()=>setLightboxId(null)}>Close</button></div><img src={preview[lightboxItem.attachment_id]} alt={lightboxItem.caption||lightboxItem.original_filename||'Trading screenshot'}/>{items.length>1&&<div className="lightboxNav"><button onClick={()=>stepLightbox(-1)}>← Previous</button><button onClick={()=>stepLightbox(1)}>Next →</button></div>}</div></div>}
  </div>
}


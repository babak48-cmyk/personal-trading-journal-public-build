import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useState } from 'react';
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

export function App(){
  const [sessions,setSessions]=useState<SessionSummary[]>([]);
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
  const [settingsSection,setSettingsSection]=useState<'APPEARANCE'|'INSTRUMENTS'|'SOURCES'|'REQUIREMENTS'>('APPEARANCE');
  const [appearance,setAppearance]=useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [prefersDark,setPrefersDark]=useState(false);
  const [requirementOverrides,setRequirementOverrides]=useState<RequirementOverrides>({});
  const [fieldVisibility,setFieldVisibility]=useState<Record<string,boolean>>({});
  const [fieldPlacements,setFieldPlacements]=useState<Record<string,FieldPlacement>>({});
  const [fieldOrder,setFieldOrder]=useState<Record<string,number>>({});
  const [fieldText,setFieldText]=useState<Record<string,{label?:string;help?:string}>>({});
  const [validationErrors,setValidationErrors]=useState<string[]>([]);
  const [showDraftSetup,setShowDraftSetup]=useState(false);
  const [draftStep,setDraftStep]=useState(1);
  const [draftBusy,setDraftBusy]=useState(false);
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
  const [evidenceTypeId,setEvidenceTypeId]=useState('');
  const [evidenceRole,setEvidenceRole]=useState<'SETUP_SUPPORT'|'ENTRY_CONFIRMATION'|'CONTRADICTING_EVIDENCE'|'INVALIDATION'|'GENERAL_OBSERVATION'>('SETUP_SUPPORT');
  const [evidenceDirection,setEvidenceDirection]=useState<'BUY'|'SELL'|'NEUTRAL'>('NEUTRAL');
  const [evidencePrice,setEvidencePrice]=useState<number|null>(null);
  const [evidenceNote,setEvidenceNote]=useState('');
  const [candidateEvidence,setCandidateEvidence]=useState<Record<string,EvidenceObservation[]>>({});
  const [quickMode,setQuickMode]=useState(true);
  const [decisionCandidate,setDecisionCandidate]=useState<CurrentCandidate|null>(null);
  const [quickZoneId,setQuickZoneId]=useState('');
  const [notebookPage,setNotebookPage]=useState<'PLAN'|'DECISION'|'EVIDENCE'|'EXECUTION'|'REVIEW'>('PLAN');
  const [decisionType,setDecisionType]=useState<'TRADE'|'NO_TRADE'|'MISSED'>('TRADE');
  const [decisionDirection,setDecisionDirection]=useState<'LONG'|'SHORT'>('LONG');
  const [decisionReason,setDecisionReason]=useState('');
  const [decisionNote,setDecisionNote]=useState('');
  const [decisionQuality,setDecisionQuality]=useState<'A'|'B'|'C'|'INVALID'|'UNCLEAR'|''>('');
  const [mismatchReason,setMismatchReason]=useState('');
  const [candidateDecisions,setCandidateDecisions]=useState<Record<string,CandidateDecision[]>>({});
  const [pendingTradeDecision,setPendingTradeDecision]=useState<CandidateDecision|null>(null);
  const [entryPrice,setEntryPrice]=useState<number|null>(null);
  const [stopPrice,setStopPrice]=useState<number|null>(null);
  const [tradeQty,setTradeQty]=useState<number>(1);
  const [plannedTarget,setPlannedTarget]=useState<number|null>(null);
  const [activeTrade,setActiveTrade]=useState<TradeDetail|null>(null);
  const [sessionTrades,setSessionTrades]=useState<TradeMetrics[]>([]);
  const [fillAction,setFillAction]=useState<'ENTRY'|'EXIT'>('EXIT');
  const [fillPrice,setFillPrice]=useState<number|null>(null);
  const [fillQty,setFillQty]=useState<number>(1);
  const [fillReason,setFillReason]=useState('');
  const [fillSaving,setFillSaving]=useState(false);
  const [fillFeedback,setFillFeedback]=useState('');
  const [newStop,setNewStop]=useState<number|null>(null);
  const [stopReason,setStopReason]=useState('');
  const [mistakeTypes,setMistakeTypes]=useState<MistakeType[]>([]);
  const [tradeReview,setTradeReview]=useState<TradeReview|null>(null);
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
    localApi.listEvidenceTypes().then(v=>{setEvidenceTypes(v); if(v[0])setEvidenceTypeId(v[0].evidence_type_id);}).catch(()=>{});
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
  function blockMissing(issues:ValidationIssue[]){
    if(!issues.length){setValidationErrors([]);return false;}
    const unique=issues.filter((issue,index,all)=>all.findIndex(x=>x.id===issue.id)===index);
    setValidationErrors(unique.map(x=>x.id));
    setMessage(`Missing required field${unique.length>1?'s':''}: ${unique.map(x=>x.label).join(', ')}.`);
    window.setTimeout(()=>{
      const target=document.querySelector<HTMLElement>(`[data-validation-id="${unique[0].id}"]`);
      target?.scrollIntoView({behavior:'smooth',block:'center'});
      target?.querySelector<HTMLElement>('input,select,textarea,button')?.focus({preventScroll:true});
    },80);
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
      setNotebookPage('PLAN');setDecisionCandidate(null);setQuickZoneId('');setPendingTradeDecision(null);setActiveTrade(null);setCandidateDecisions({});
    }
    setActive(s);
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
          setCandidates(d.candidates);setDraftStep(Number.isInteger(d.step)&&d.step>=1&&d.step<=3?d.step:1);
        } else setDraftStep(1);
      } catch(e) { setMessage('Could not restore draft fields: '+String(e)); }
      return;
    }
    try{
      const p=await localApi.getCurrentPlan(s.session_id); setPlan(p);
      setTimeline(await localApi.listPlanTimeline(s.session_id));
      setConsistency(await localApi.checkPlanConsistency(s.session_id));
      setSessionTrades(await localApi.listSessionTrades(s.session_id));
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
    try{const s=await localApi.createDraftSession({session_date:date,instrument_symbol:instrument,environment}); setActive(s); setPlan(null); setDraftDirty(false); setDraftStep(1); setMessage('Draft session created. Build the initial plan, then confirm it.'); await refresh();}
    catch(e){setMessage(String(e));}
  }

  async function saveAndAdvanceDraft(nextStep:number){
    if(!active||active.status!=='DRAFT'||draftBusy)return;
    setDraftBusy(true);
    try {
      await localApi.saveInitialPlanDraft(active.session_id,{
        version:1,step:nextStep,bias,mainScenario,altScenario,preSessionState,preSessionStateIntensity,candidates
      });
      setDraftStep(nextStep);setDraftDirty(false);
      setMessage('Draft saved to local database.');
    }catch(e){setMessage('Draft not saved: '+String(e));}
    finally{setDraftBusy(false);}
  }

  async function saveDraftSessionSetup(){
    if(!active||active.status!=='DRAFT')return;
    try{
      const s=await localApi.updateDraftSession({session_id:active.session_id,session_date:date,instrument_symbol:instrument,environment});
      setActive(s);setShowDraftSetup(false);setDraftStep(1);setMessage('Draft session setup updated.');await refresh();
    }catch(e){setMessage(String(e));}
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
    setEvidenceRole('SETUP_SUPPORT');
    setEvidenceDirection('NEUTRAL');
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
    setActiveTrade(null);
    setSessionTrades([]);
    setFillAction('EXIT');
    setFillPrice(null);
    setFillQty(1);
    setFillReason('');
    setNewStop(null);
    setStopReason('');

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
    const configuredLabel=(id:string,fallback:string)=>fieldText[id]?.label?.trim()||fallback;
    const missing=missingRequired([
      ['plan.mainScenario',!!mainScenario.trim()],
      ['plan.alternativeScenario',!!altScenario.trim()],
      ['plan.preSessionState',!!preSessionState.trim()],
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
      setDraftStep(first.id.startsWith('candidate-')?2:1);
      blockMissing(missing);
      return;
    }
    const badZone=candidates.findIndex(c=>c.price_mode==='RANGE'&&c.price_from!=null&&c.price_to!=null&&c.price_from>c.price_to);
    if(badZone>=0){const c=candidates[badZone];setDraftStep(2);setValidationErrors([`candidate-${badZone}.priceFrom`,`candidate-${badZone}.priceTo`]);setMessage(`Zone ${badZone+1} (${c.label||'Unnamed'}): From ${c.price_from} exceeds To ${c.price_to}. Correct the highlighted range before confirming.`);window.setTimeout(()=>{const node=document.querySelector<HTMLElement>(`[data-validation-id="candidate-${badZone}.priceFrom"]`);node?.scrollIntoView({behavior:'smooth',block:'center'});node?.querySelector<HTMLElement>('input')?.focus({preventScroll:true});},120);return;}
    setValidationErrors([]);
    try{
      await localApi.confirmInitialPlan({session_id:active.session_id,initial_bias:bias,main_scenario:mainScenario||null,alternative_scenario:altScenario||null,expected_context:[],things_not_to_do:[],pre_session_state:preSessionState||null,pre_session_state_intensity:preSessionStateIntensity,candidates:candidates.map(cleanCandidate)});
      setMessage('Initial plan confirmed and locked into immutable history.'); await refreshPlan();
    }catch(e){setMessage(String(e));}
  }

  async function savePlanUpdate(){
    if(!active||!plan)return;
    try{
      await localApi.createPlanRevision({session_id:active.session_id,initial_bias:newBias||null,why_changed:planReason,change_type:'MARKET_VIEW_UPDATE',new_evidence_summary:planEvidence||null});
      setShowPlanUpdate(false); setPlanReason('');setPlanEvidence('');setNewBias('');setMessage('New plan revision saved. Original plan remains unchanged.');await refreshPlan();
    }catch(e){setMessage(String(e));}
  }

  function beginCandidateEdit(c:CurrentCandidate){setEditing(c);setEditIntent(c.directional_intent);setEditFrom(c.price_from??null);setEditTo(c.price_to??null);setEditSingle(c.reference_price??null);setEditReason('');setEditSourceIds(c.source_type_ids);}
  function toggleEditSource(id:string){setEditSourceIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
  async function saveCandidateRevision(){
    if(!editing)return;
    try{
      await localApi.reviseCandidate({candidate_id:editing.candidate_id,directional_intent:editIntent,trend_relationship:editing.trend_relationship??null,price_mode:editing.price_mode,price_from:editFrom,price_to:editTo,reference_price:editSingle,required_conditions:editing.required_conditions,invalidation_conditions:editing.invalidation_conditions,notes:editing.notes??null,change_type:'UPDATE',change_reason:editReason,sources:editSourceIds.map(source_type_id=>({source_type_id}))});
      setEditing(null);setMessage('Zone revision saved without overwriting the original.');await refreshPlan();
    }catch(e){setMessage(String(e));}
  }

  async function setStatus(c:CurrentCandidate,status:string){
    try{
      let reason:string|null=null;
      if(['INVALIDATED','CANCELLED','EXPIRED'].includes(status))reason=window.prompt('Reason (optional)')||null;
      await localApi.addCandidateStatus(c.candidate_id,status,reason);setMessage(`${c.label||'Zone'} → ${status}`);await refreshPlan();
    }catch(e){setMessage(String(e));}
  }

  async function addLiveZone(){
    if(!active)return;
    try{
      await localApi.addLiveCandidate({session_id:active.session_id,why_changed:liveCandidateReason,new_evidence_summary:liveCandidateEvidence||null,candidate:cleanCandidate(liveCandidate)});
      setLiveCandidate(emptyCandidate('DURING_SESSION'));setLiveCandidateReason('');setLiveCandidateEvidence('');setShowLiveCandidate(false);
      setMessage('New live zone added through a new immutable plan revision.');await refreshPlan();
    }catch(e){setMessage(String(e));}
  }

  async function openEvidence(c:CurrentCandidate){
    setNotebookPage('EVIDENCE');setEvidenceCandidate(c); setEvidencePrice(null); setEvidenceNote(''); setEvidenceDirection('NEUTRAL'); setEvidenceRole('SETUP_SUPPORT');
    try{
      const rows = await localApi.listCandidateEvidence(c.candidate_id);
      setCandidateEvidence(v=>({...v,[c.candidate_id]:rows}));
    }catch{}
  }
  async function saveEvidence(){
    if(!active||!evidenceCandidate||!evidenceTypeId)return;
    try{
      await localApi.addEvidenceObservation({session_id:active.session_id,candidate_id:evidenceCandidate.candidate_id,evidence_type_id:evidenceTypeId,role:evidenceRole,direction:evidenceDirection,price:evidencePrice,note:evidenceNote||null});
      const rows=await localApi.listCandidateEvidence(evidenceCandidate.candidate_id); setCandidateEvidence(v=>({...v,[evidenceCandidate.candidate_id]:rows}));
      setEvidenceNote('');setEvidencePrice(null);setMessage('Evidence captured with timestamp.');setTimeline(await localApi.listPlanTimeline(active.session_id));
    }catch(e){setMessage(String(e));}
  }


  async function openDecision(c:CurrentCandidate,type:'TRADE'|'NO_TRADE'|'MISSED'='TRADE'){
    setNotebookPage('DECISION');setQuickZoneId(c.candidate_id);setDecisionCandidate(c); setDecisionType(type); setDecisionReason(''); setDecisionNote(''); setDecisionQuality(''); setMismatchReason('');
    if(c.directional_intent==='LONG'||c.directional_intent==='SHORT') setDecisionDirection(c.directional_intent);
    try{const rows=await localApi.listCandidateDecisions(c.candidate_id);setCandidateDecisions(v=>({...v,[c.candidate_id]:rows}));}catch{}
  }
  async function saveDecision(){
    if(!active||!decisionCandidate)return;
    const isTrade=decisionType==='TRADE';
    const decisionMissing:ValidationIssue[]=[];
    if(!isTrade&&!decisionReason.trim()&&!decisionNote.trim())decisionMissing.push({id:'decision.reason',label:'Decision reason'});
    if(isUserRequired('decision.quality',requirementOverrides)&&!decisionQuality)decisionMissing.push({id:'decision.quality',label:'Decision quality'});
    if(blockMissing(decisionMissing))return;
    const opposite=isTrade && ['LONG','SHORT'].includes(decisionCandidate.directional_intent) && decisionDirection!==decisionCandidate.directional_intent;
    if(opposite&&!mismatchReason.trim()){setMessage('A trade opposite to the planned direction needs a short reason.');return;}
    try{
      const saved=await localApi.createCandidateDecision({session_id:active.session_id,candidate_id:decisionCandidate.candidate_id,decision_type:decisionType,intended_direction:isTrade?decisionDirection:null,reason_code:decisionReason||null,reason_note:decisionNote||null,decision_quality:decisionQuality||null,decision_quality_note:null,plan_mismatch_reason:mismatchReason||null});
      const rows=await localApi.listCandidateDecisions(decisionCandidate.candidate_id);setCandidateDecisions(v=>({...v,[decisionCandidate.candidate_id]:rows}));
      setTimeline(await localApi.listPlanTimeline(active.session_id));
      if(isTrade){ setNotebookPage('EXECUTION'); setPendingTradeDecision(saved); setEntryPrice(null); setStopPrice(null); setTradeQty(1); setPlannedTarget(null); setMessage('Trade decision saved. Record only entry, stop and quantity now.'); window.requestAnimationFrame(()=>document.getElementById('journal-quick-entry')?.scrollIntoView({behavior:'smooth',block:'start'})); }
      else setMessage(`${decisionType} decision saved. You can record another decision later if this level is revisited.`);
      setDecisionCandidate(null);
    }catch(e){setMessage(String(e));}
  }


  async function createExecutedTrade(){
    if(!pendingTradeDecision)return;
    const missing:ValidationIssue[]=[];
    if(entryPrice==null)missing.push({id:'trade.entryPrice',label:'Entry price'});
    if(stopPrice==null)missing.push({id:'trade.stopPrice',label:'Stop price'});
    if(tradeQty<=0)missing.push({id:'trade.quantity',label:'Quantity'});
    if(isUserRequired('trade.plannedTarget',requirementOverrides)&&plannedTarget==null)missing.push({id:'trade.plannedTarget',label:'Planned target'});
    if(blockMissing(missing))return;
    if(entryPrice==null||stopPrice==null)return;
    try{
      const detail=await localApi.createTradeWithEntry({decision_id:pendingTradeDecision.decision_id,entry_price:entryPrice,stop_price:stopPrice,quantity:tradeQty,order_type:'MARKET',planned_target_price:plannedTarget});
      setActiveTrade(detail); setPendingTradeDecision(null); setMessage('Trade opened. Entry and initial risk are recorded with timestamps.');
      if(active)setSessionTrades(await localApi.listSessionTrades(active.session_id));
    }catch(e){setMessage(String(e));}
  }
  async function addFill(){
    if(fillSaving||!activeTrade||fillPrice==null||fillQty<=0)return;
    setFillSaving(true);setFillFeedback('');
    try{
      const detail=await localApi.addTradeFill({trade_id:activeTrade.metrics.trade_id,action:fillAction,price:fillPrice,quantity:fillQty,order_type:'MARKET',note:fillReason||null});
      setActiveTrade(detail);setFillPrice(null);setFillQty(1);setFillReason('');const success=fillAction==='EXIT'?'Exit fill recorded.':'Additional entry fill recorded.';setMessage(success);setFillFeedback(success);
      if(active)setSessionTrades(await localApi.listSessionTrades(active.session_id));
    }catch(e){setMessage(String(e));setFillFeedback(`Fill not saved: ${String(e)}`);}finally{setFillSaving(false);}
  }
  async function moveStop(){
    if(!activeTrade||newStop==null)return;
    try{
      const detail=await localApi.moveTradeStop({trade_id:activeTrade.metrics.trade_id,stop_price:newStop,reason:stopReason||null});
      setActiveTrade(detail);setNewStop(null);setStopReason('');setMessage('Stop change saved as a new immutable risk snapshot.');
      if(active)setSessionTrades(await localApi.listSessionTrades(active.session_id));
    }catch(e){setMessage(String(e));}
  }
  function applyReview(r:TradeReview|null){
    setTradeReview(r);
    setReviewDecisionQuality((r?.decision_quality as any)||'');
    setReviewExecutionQuality((r?.execution_quality as any)||'');
    setReviewManagementQuality((r?.management_quality as any)||'');
    setReviewExitReason(r?.exit_reason_code||''); setReviewExitNote(r?.exit_reason_note||'');
    setEmotionAffected(r?.emotion_affected??null); setPsychState(r?.psychology_state||''); setPsychIntensity(r?.psychology_intensity??null);
    setPsychStage((r?.psychology_stage as any)||''); setReviewMistakes(r?.mistake_type_ids||[]); setReviewNote(r?.note||'');
  }
  async function openTradeDetail(t:TradeMetrics){setNotebookPage('EXECUTION');try{setActiveTrade(await localApi.getTradeDetail(t.trade_id));applyReview(await localApi.getTradeReview(t.trade_id));applyRuleCheck(await localApi.getTradeRuleCheck(t.trade_id));}catch(e){setMessage(String(e));}}
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
    if(!active)return;
    try{const r=await localApi.saveSessionReview({session_id:active.session_id,what_went_well:srWentWell||null,what_went_poorly:srWentPoorly||null,best_decision:srBestDecision||null,biggest_mistake:srBiggestMistake||null,market_learning:srMarketLearning||null,next_improvement:srNextImprovement||null,plan_quality:srPlanQuality||null,discipline:srDiscipline||null,overall_assessment:srOverall||null,finalize});applySessionReview(r);setMessage(finalize?'Session review completed and session closed.':'Session review draft saved.');await refresh();if(finalize){setActive(a=>a?{...a,status:'CLOSED'}:a);}}catch(e){setMessage(String(e));}
  }
  async function saveReview(finalize=false){
    if(!activeTrade)return;
    const missing=missingRequired([
      ['review.decisionQuality',!!reviewDecisionQuality],
      ['review.executionQuality',!!reviewExecutionQuality],
      ['review.managementQuality',!!reviewManagementQuality],
      ['psychology.emotionAffected',emotionAffected!==null],
    ]);
    if(emotionAffected===true){
      if(!psychState)missing.push({id:'psychology.state',label:'Psychology state'});
      if(!psychStage)missing.push({id:'psychology.stage',label:'Affected stage'});
    }
    if(blockMissing(missing))return;
    try{
      if(ruleViolationReported!==null){
        const rc=await localApi.saveTradeRuleCheck({trade_id:activeTrade.metrics.trade_id,any_violation:ruleViolationReported,violated_rule_version_ids:ruleViolationReported?violatedRuleIds:[],note:ruleNote||null});
        applyRuleCheck(rc);
      }
      const r=await localApi.saveTradeReview({trade_id:activeTrade.metrics.trade_id,decision_quality:reviewDecisionQuality||null,execution_quality:reviewExecutionQuality||null,management_quality:reviewManagementQuality||null,exit_reason_code:reviewExitReason||null,exit_reason_note:reviewExitNote||null,emotion_affected:emotionAffected,psychology_state:emotionAffected?psychState||null:null,psychology_intensity:emotionAffected?psychIntensity:null,psychology_stage:emotionAffected?(psychStage||null):null,mistake_type_ids:reviewMistakes,note:reviewNote||null,finalize});
      applyReview(r); setMessage(finalize?'Post-trade review completed and locked.':'Review draft saved.');
    }catch(e){setMessage(String(e));}
  }

  const tickStep=active?.instrument_tick_size??instruments.find(x=>x.symbol===instrument)?.tick_size??0.01;

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
    {!showAnalysis && !showSettings && <div className="journeyStrip" aria-label="Trading journal workflow">
      <div className="journeyHeading"><strong>YOUR WORKFLOW</strong><span>{active ? `${active.session_date} · ${active.instrument_symbol} · ${active.environment}` : 'Start a DEMO session to begin'}</span></div>
      <div className="journeySteps">
        <div className={active ? 'journeyStep journeyDone' : 'journeyStep journeyCurrent'}><span>01</span><b>Session</b><small>{active ? 'Selected' : 'Start here'}</small></div>
        <div className={plan ? 'journeyStep journeyDone' : active ? 'journeyStep journeyCurrent' : 'journeyStep'}><span>02</span><b>Plan & Zones</b><small>{plan ? 'Confirmed' : active ? 'Draft / confirm' : 'Next'}</small>{active?.status==='DRAFT' && !plan && <div className="journeyDraftLinks"><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(1)}>Plan</button><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(2)}>Zones</button><button type="button" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(3)}>Review</button></div>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>03</span><b>Evidence</b><small>{plan ? `${Object.values(candidateEvidence).reduce((n,items)=>n+items.length,0)} observed` : 'Record what happened'}</small>{plan && plan.candidates.length>0 && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'})}>Select zone ↓</button>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>04</span><b>Decision</b><small>{plan ? `${Object.values(candidateDecisions).reduce((n,items)=>n+items.length,0)} decisions` : 'Trade / No-trade / Missed'}</small>{plan && plan.candidates.length>0 && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'})}>Select zone ↓</button>}</div>
        <div className={plan ? 'journeyStep journeyAvailable' : 'journeyStep'}><span>05</span><b>Execution</b><small>{plan ? `${sessionTrades.length} actual trade(s)` : 'Actual fills & risk'}</small>{plan && sessionTrades.length>0 && <button type="button" className="journeyJump" onClick={()=>document.getElementById('journal-session-trades')?.scrollIntoView({behavior:'smooth',block:'start'})}>View trades ↓</button>}</div>
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
        <details className="futureFeatures"><summary>Feature roadmap · implementation status (not active where stated)</summary><p className="subtle">No approved requirement is cancelled by deferral. Status is provisional until the full Master Register audit and installed Windows tests. This is a feature-family overview, not an exhaustive inventory.</p><ul><li>Guided planning and Zone workflow — <strong>Implemented in beta branch; Windows acceptance pending</strong></li><li>Field Manager: requirements, visibility and Quick/Detailed (connected fields) — <strong>Partial; Windows acceptance pending</strong></li><li>Field Manager: all-input coverage, ordering, editable labels/help — <strong>Not yet active</strong></li><li>Typed custom fields, option history and analytics — <strong>Not yet active</strong></li><li>Audited data correction preserving original events — <strong>Not yet active</strong></li><li>Decision, execution and review guided UX — <strong>Partial / verification pending</strong></li><li>Cost-aware analytics, missed setups and weekly action review — <strong>Partial / future improvements pending</strong></li><li>Optional setup Playbook — <strong>Not yet active</strong></li><li>NinjaTrader import with tested identity and deduplication — <strong>Conditional / not yet active</strong></li></ul><p className="subtle">Detailed outstanding items remain governed by the approved Master Requirements Register and no-requirement-loss policy. Planned entries do not perform actions.</p></details>
        <div className="recent"><strong>Recent</strong>{sessions.map(s=><button className="sessionLink" key={s.session_id} onClick={()=>loadActive(s)}>{s.session_date} · {s.instrument_symbol}<small>{s.status}</small></button>)}</div>
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
        {active&&!showSettings&&!showAnalysis&&<SessionCustomSelections sessionId={active.session_id} quickMode={quickMode}/>}
        {active&&!showSettings&&!showAnalysis&&<SessionTypedCustomFields sessionId={active.session_id} quickMode={quickMode}/>}
        {active&&!showSettings&&!showAnalysis&&!showSafety&&(!plan||!quickMode||notebookPage==='DECISION')&&<section className="panel" aria-label="Quick capture" style={{padding:16,marginBottom:16}}>
          <div className="panelTitle"><div><h2>Quick capture</h2><p className="subtle">Current session · choose a Zone, then record a decision. Execution is separate.</p></div></div>
          <div className="rowActions" style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
            <button type="button" onClick={()=>{if(active.status==='DRAFT')setDraftStep(2);else document.getElementById('journal-zone-actions')?.scrollIntoView({behavior:'smooth',block:'start'});}} disabled={active.status!=='DRAFT'&&!plan}>View Zones</button>
            {active.status!=='DRAFT'&&plan&&<>
              <label htmlFor="quick-zone-choice">Zone</label>
              <select id="quick-zone-choice" aria-label="Choose current session Zone" value={quickZoneId} onChange={e=>{
                if(decisionCandidate&&(decisionReason.trim()||decisionNote.trim()||decisionQuality||mismatchReason.trim())&&!window.confirm('Unsaved decision details will be lost. Change Zone?'))return;
                setQuickZoneId(e.target.value);setDecisionCandidate(null);
              }}><option value="">Choose Zone</option>{plan.candidates.map(c=><option key={c.candidate_id} value={c.candidate_id}>{c.label||'Unnamed zone'} · {c.directional_intent}</option>)}</select>
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
        {showAnalysis ? <AnalyticsPanel filter={journalFilter} patchFilter={patchJournalFilter} apply={()=>refreshAnalytics()} rows={journalRows} summary={analytics} mistakes={mistakeSummary} sources={sources} evidenceTypes={evidenceTypes} openTrade={async(id)=>{try{const d=await localApi.getTradeDetail(id);setActiveTrade(d);setShowAnalysis(false);const sess=sessions.find(x=>x.session_id===d.metrics.session_id);if(sess)await loadActive(sess);}catch(e){setMessage(String(e));}}}/> : showSafety ? (runtimeReadiness ? <SafetyPanel readiness={runtimeReadiness} selfTest={betaSelfTest} selfTestBusy={betaSelfTestBusy} onSelfTest={runBetaSelfTest} onRefresh={refreshSafety} onBackup={createBackupWithFeedback} backupBusy={backupBusy}/> : <div className="panel"><h2>Local Safety Check</h2><p>Loading safety status…</p></div>) : <>
        {backupResult&&<div role="status" aria-live="polite" className={backupResult.startsWith('Backup failed')?'warningBox':'okBox'} style={{position:'fixed',right:24,top:72,zIndex:1000,maxWidth:480,boxShadow:'0 8px 28px #0008'}}><strong>{backupResult.startsWith('Backup failed')?'Backup failed':'Backup created successfully'}</strong><p style={{overflowWrap:'anywhere'}}>{backupResult}</p><button onClick={()=>setBackupResult('')}>Dismiss</button></div>}
        {!active && runtimeReadiness && !runtimeReadiness.ready_for_live_data && <div className="warningBox"><strong>Local safety check needs attention.</strong> {runtimeReadiness.warnings[0]||'Create a verified backup before recording real-money data.'} <button onClick={()=>setShowSafety(true)}>Review</button></div>}
        {!active && <div className="panel"><h2>Start session</h2><div className="formGrid"><label>Date <FieldHelp id="session.date"/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Instrument <FieldHelp id="session.instrument" value={instrument}/><select value={instrument} onChange={e=>setInstrument(e.target.value)}>{instruments.map(x=><option key={x.instrument_id} value={x.symbol}>{x.symbol}{x.display_name?` — ${x.display_name}`:''}</option>)}</select></label><label>Environment <FieldHelp id="session.environment" value={environment}/><select value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="DEMO">Demo</option><option value="FORWARD_TEST">Forward test</option><option value="REAL">Real</option></select></label></div><button className="primary" onClick={start}>Create draft session</button></div>}

        {active && active.status!=='DRAFT' && !plan && <div className="warningBox"><strong>Confirmed session state detected.</strong> The draft editor is intentionally unavailable because this session is {active.status}. Use another session or reload if its confirmed plan should be visible.</div>}
        {active && active.status==='DRAFT' && !plan && <>
          <div className="stageNav"><strong>Planning: {['','Initial Plan','Zones','Review & Confirm'][draftStep]}</strong><button onClick={beginEditDraftSetup}>Edit session setup</button><button onClick={newSession}>Start another session</button><span>Draft: Save & Continue persists changes locally.</span></div>
          <div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>1. Plan</button><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>2. Zones</button><button onClick={()=>saveAndAdvanceDraft(3)} disabled={draftBusy}>3. Review</button></div>
          {showDraftSetup&&<div className="panel"><div className="panelTitle"><div><h2>Edit session setup</h2><p className="subtle">Available only while the session is still a draft.</p></div><button onClick={()=>setShowDraftSetup(false)}>Close</button></div><div className="formGrid"><label>Date <FieldHelp id="session.date"/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Instrument <FieldHelp id="session.instrument" value={instrument}/><select value={instrument} onChange={e=>setInstrument(e.target.value)}>{instruments.map(x=><option key={x.instrument_id} value={x.symbol}>{x.symbol}{x.display_name?` — ${x.display_name}`:''}</option>)}</select></label><label>Environment <FieldHelp id="session.environment" value={environment}/><select value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="DEMO">Demo</option><option value="FORWARD_TEST">Forward test</option><option value="REAL">Real</option></select></label></div><div className="rowActions"><button onClick={()=>setShowDraftSetup(false)}>Cancel</button><button className="primary" onClick={saveDraftSessionSetup}>Save changes & return to plan</button></div></div>}
          <div onChangeCapture={()=>setDraftDirty(true)}>
          {draftStep===1&&<><div className="panel"><h2>Your market plan</h2><p className="subtle">Your expectations before trading — observed market evidence is recorded later.</p><div className="formGrid"><label>Which direction do you currently favor? <small>Market outlook</small> <RequirementBadge id="plan.bias" overrides={requirementOverrides}/> <FieldHelp id="plan.bias" value={bias}/><select value={bias} onChange={e=>setBias(e.target.value as any)}>{['LONG','SHORT','NEUTRAL','MIXED','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label>{isFieldPresented('plan.preSessionState',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label data-validation-id="plan.preSessionState" className={invalidClass('plan.preSessionState')}>How do you feel before trading? <small>Pre-session state</small> <RequirementBadge id="plan.preSessionState" overrides={requirementOverrides}/> <FieldHelp id="plan.preSessionState" value={preSessionState}/><small>one quick check</small><select value={preSessionState} onChange={e=>{setPreSessionState(e.target.value);clearValidation('plan.preSessionState')}}><option value="">—</option>{['CALM','FOCUSED','TIRED','FRUSTRATED','DISTRACTED','HESITANT','OVERCONFIDENT','OTHER'].map(x=><option key={x}>{x}</option>)}</select></label>}{isFieldPresented('plan.preSessionStateIntensity',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Intensity <small>Optional</small><select value={preSessionStateIntensity??''} onChange={e=>setPreSessionStateIntensity(e.target.value?Number(e.target.value):null)}><option value="">—</option>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label>}{isFieldPresented('plan.mainScenario',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.mainScenario')}} data-validation-id="plan.mainScenario" className={invalidClass('plan.mainScenario')}>{fieldText['plan.mainScenario']?.label?.trim()||'What do you think price may do?'} {fieldText['plan.mainScenario']?.help&&<small title={fieldText['plan.mainScenario'].help}>ⓘ</small>} <small>Main scenario</small> <RequirementBadge id="plan.mainScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.mainScenario"/><textarea value={mainScenario} onChange={e=>{setMainScenario(e.target.value);clearValidation('plan.mainScenario')}} placeholder={isUserRequired('plan.mainScenario',requirementOverrides)?'Required by you':'Optional'}/></label>}{isFieldPresented('plan.alternativeScenario',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&(isUserRequired('plan.alternativeScenario',requirementOverrides)?<label style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.alternativeScenario')}} data-validation-id="plan.alternativeScenario" className={invalidClass('plan.alternativeScenario')}>{fieldText['plan.alternativeScenario']?.label?.trim()||'What is your backup scenario?'} {fieldText['plan.alternativeScenario']?.help&&<small title={fieldText['plan.alternativeScenario'].help}>ⓘ</small>} <small>Alternative scenario</small> <RequirementBadge id="plan.alternativeScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.alternativeScenario"/><textarea value={altScenario} onChange={e=>{setAltScenario(e.target.value);clearValidation('plan.alternativeScenario')}} placeholder={isUserRequired('plan.alternativeScenario',requirementOverrides)?'Required by you':'Optional'}/></label>:<details style={{order:10+orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],fieldOrder).indexOf('plan.alternativeScenario')}} className="guidedMore"><summary>Optional — backup scenario {altScenario.trim()?'(saved)':'(not set)'}</summary><label data-validation-id="plan.alternativeScenario" className={invalidClass('plan.alternativeScenario')}>{fieldText['plan.alternativeScenario']?.label?.trim()||'What is your backup scenario?'} {fieldText['plan.alternativeScenario']?.help&&<small title={fieldText['plan.alternativeScenario'].help}>ⓘ</small>} <small>Alternative scenario</small> <RequirementBadge id="plan.alternativeScenario" overrides={requirementOverrides}/> <FieldHelp id="plan.alternativeScenario"/><textarea value={altScenario} onChange={e=>{setAltScenario(e.target.value);clearValidation('plan.alternativeScenario')}} placeholder={isUserRequired('plan.alternativeScenario',requirementOverrides)?'Required by you':'Optional'}/></label></details>)}</div></div>
          <AttachmentPanel ownerType="SESSION" ownerId={active.session_id} defaultStage="PRE_MARKET" title="Pre-market screenshot" compact />
          <div className="rowActions"><button className="primary" onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>Save & Continue to Zones →</button></div></>}
          {draftStep===2&&<>
          {candidates.map((c,i)=><div className="panel" key={i}><div className="panelTitle"><h2>Zone {i+1} — opportunity location</h2>{candidates.length>1&&<button onClick={()=>{setDraftDirty(true);setValidationErrors([]);setCandidates(v=>v.filter((_,n)=>n!==i))}}>Remove</button>}</div><CandidateEditor candidate={c} patch={p=>patchCandidate(i,p)} groupedSources={groupedSources} selected={c.sources.map(s=>s.source_type_id)} toggleSource={id=>toggleSource(i,id)} tickStep={tickStep} requirementOverrides={requirementOverrides} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} fieldText={fieldText} fieldOrder={fieldOrder} quickMode={quickMode} validationPrefix={`candidate-${i}`} validationErrors={validationErrors} clearValidation={clearValidation}/></div>)}
          <div className="rowActions"><button onClick={()=>{setDraftDirty(true);setCandidates(v=>[...v,emptyCandidate()])}}>+ Add zone</button><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>← Back</button><button className="primary" disabled={draftBusy} onClick={()=>saveAndAdvanceDraft(3)}>Save & Continue →</button></div></>}
          {draftStep===3&&<div className="panel"><h2>Review & Confirm</h2><p>Review your initial plan before creating immutable history.</p>
            <p><strong>Session:</strong> {active.session_date} · {active.instrument_symbol} · {active.environment}</p>
            <p><strong>Bias:</strong> {bias}</p>
            <p><strong>Main scenario:</strong> {mainScenario||'Not set'}</p><p><strong>Alternative:</strong> {altScenario||'Not set'}</p>
            <p><strong>Pre-session state:</strong> {preSessionState||'Not set'}{preSessionStateIntensity!=null?` · Intensity ${preSessionStateIntensity}/5`:''}</p>
            <div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(1)} disabled={draftBusy}>Edit Plan</button><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>Edit Zones</button></div>
            {candidates.map((c,i)=><div key={i} className="panel"><div className="summaryStrip"><span><b>Zone {i+1}</b>{c.label||'Unnamed'}</span><span><b>Intent</b>{c.directional_intent}</span><span><b>Price</b>{c.price_mode==='RANGE'?`${c.price_from??'—'} – ${c.price_to??'—'}`:c.price_mode==='SINGLE'?String(c.reference_price??'—'):'Unspecified'}</span><span><b>Sources</b>{c.sources.length}</span></div>{c.trend_relationship&&c.trend_relationship!=='UNCLEAR'&&<p><strong>Trend context:</strong> {c.trend_relationship.replaceAll('_',' ')}</p>}{c.sources.length>0&&<p><strong>Level sources:</strong> {c.sources.map(source=>groupedSources.flatMap(([,items])=>items).find(item=>item.source_type_id===source.source_type_id)?.label??source.source_type_id).join(', ')}</p>}{cleanLines(c.required_conditions).length>0&&<p><strong>Planned entry conditions:</strong> {cleanLines(c.required_conditions).join('; ')}</p>}{cleanLines(c.invalidation_conditions).length>0&&<p><strong>Abandon idea when:</strong> {cleanLines(c.invalidation_conditions).join('; ')}</p>}</div>)}
            <div className="rowActions"><button onClick={()=>saveAndAdvanceDraft(2)} disabled={draftBusy}>← Back</button><button className="primary" disabled={draftBusy} onClick={confirm}>Confirm initial plan</button></div>
          </div>}
          </div>
        </>}

        {active&&plan&&<>
          {quickMode&&<nav className="panel" aria-label="Quick notebook pages" style={{padding:12,marginBottom:12}}>
            <strong>Journal pages</strong><p className="subtle">One page at a time. Previously entered values stay in place.</p>
            <div className="rowActions" style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {(['PLAN','DECISION','EVIDENCE','EXECUTION','REVIEW'] as const).map((page,i)=><button key={page} type="button" className={notebookPage===page?'primary':''} onClick={()=>{setNotebookPage(page);window.scrollTo({top:0,behavior:'smooth'});}}>{i+1}. {page==='PLAN'?'Zones':page==='DECISION'?'Decision':page==='EVIDENCE'?'Evidence':page==='EXECUTION'?'Trade':'Review'}</button>)}
            </div>
            <div className="rowActions"><button type="button" disabled={notebookPage==='PLAN'} onClick={()=>{const pages=['PLAN','DECISION','EVIDENCE','EXECUTION','REVIEW'] as const;setNotebookPage(pages[Math.max(0,pages.indexOf(notebookPage)-1)]);window.scrollTo(0,0);}}>← Previous</button><button type="button" disabled={notebookPage==='REVIEW'} onClick={()=>{const pages=['PLAN','DECISION','EVIDENCE','EXECUTION','REVIEW'] as const;setNotebookPage(pages[Math.min(4,pages.indexOf(notebookPage)+1)]);window.scrollTo(0,0);}}>Next page →</button></div>
          </nav>}
          <div style={{display:!quickMode||notebookPage==='PLAN'?'block':'none'}}>
          <div id="journal-current-plan" className="panel"><div className="panelTitle"><div><h2>Current plan</h2><p className="subtle">Revision {plan.revision_number} · updated {timeLabel(plan.created_at)}</p></div><div className="headerActions"><button onClick={()=>setShowLiveCandidate(v=>!v)}>+ Add live zone</button><button className="primary" onClick={()=>setShowPlanUpdate(v=>!v)}>Revise plan</button></div></div>
            <div className="summaryStrip"><span><b>Bias</b>{plan.initial_bias}</span><span><b>Active zones</b>{consistency?.active_candidate_count??activeCandidates.length}</span><span><b>Inactive</b>{consistency?.cancelled_candidate_count??0}</span><span className={consistency?.warning_codes.length?'warningCell':'okCell'}><b>Consistency</b>{consistency?.warning_codes.length?`${consistency.warning_codes.length} warning(s)`:'OK'}</span></div>
            {plan.main_scenario&&<p><strong>Main:</strong> {plan.main_scenario}</p>}{plan.alternative_scenario&&<p><strong>Alternative:</strong> {plan.alternative_scenario}</p>}
            {consistency&&consistency.warning_codes.length>0&&<details className="warningBox"><summary>Plan consistency warnings</summary>{consistency.warning_codes.map(x=><div key={x}>{x}</div>)}</details>}

            {showPlanUpdate&&<div className="inlineEditor"><h3>New plan revision</h3><div className="formGrid"><label>Bias change<select value={newBias} onChange={e=>setNewBias(e.target.value)}><option value="">Keep current</option>{['LONG','SHORT','NEUTRAL','MIXED','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label><label>Why did the plan change? <textarea value={planReason} onChange={e=>setPlanReason(e.target.value)} placeholder="Required"/></label><label>New evidence<textarea value={planEvidence} onChange={e=>setPlanEvidence(e.target.value)} placeholder="Optional"/></label></div><div className="rowActions"><button onClick={()=>setShowPlanUpdate(false)}>Cancel</button><button className="primary" disabled={!planReason.trim()} onClick={savePlanUpdate}>Create revision</button></div></div>}

            {showLiveCandidate&&<div className="inlineEditor"><h3>Add a new zone during the live session</h3><CandidateEditor candidate={liveCandidate} patch={p=>setLiveCandidate(c=>({...c,...p}))} groupedSources={groupedSources} selected={liveCandidate.sources.map(s=>s.source_type_id)} toggleSource={toggleLiveSource} tickStep={tickStep} requirementOverrides={requirementOverrides} fieldVisibility={fieldVisibility} fieldPlacements={fieldPlacements} fieldText={fieldText} fieldOrder={fieldOrder} quickMode={quickMode} validationPrefix="liveCandidate" validationErrors={validationErrors} clearValidation={clearValidation}/><div className="formGrid"><label>Why is this new zone being added?<textarea value={liveCandidateReason} onChange={e=>setLiveCandidateReason(e.target.value)} placeholder="Required — e.g. new structure / new liquidity information"/></label><label>New evidence summary<textarea value={liveCandidateEvidence} onChange={e=>setLiveCandidateEvidence(e.target.value)} placeholder="Optional"/></label></div><div className="rowActions"><button onClick={()=>setShowLiveCandidate(false)}>Cancel</button><button className="primary" disabled={!liveCandidateReason.trim()} onClick={addLiveZone}>Add through new plan revision</button></div></div>}

            <div id="journal-zone-actions" className="planCards">{plan.candidates.map(c=><article className={`zoneSummary intent-${c.directional_intent.toLowerCase()}`} key={c.candidate_id}><div className="zoneHead"><strong>{c.directional_intent} · {c.label||'Unnamed zone'}</strong><span className={`statusPill status-${c.current_status.toLowerCase()}`}>{c.current_status}</span></div><span>{c.price_mode==='RANGE'?`${c.price_from} – ${c.price_to}`:c.price_mode==='SINGLE'?c.reference_price:'Price not fixed'}</span><p>{c.sources.join(' · ')||'No source recorded'}</p>{c.required_conditions.length>0&&<small>Need: {c.required_conditions.join(' · ')}</small>}<div className="quickStatus"><button onClick={()=>setStatus(c,'WATCHING')}>Watching</button><button onClick={()=>setStatus(c,'REACHED')}>Reached</button><button onClick={()=>setStatus(c,'VALID')}>Valid</button><button onClick={()=>setStatus(c,'INVALIDATED')}>Invalid</button><button onClick={()=>setStatus(c,'CANCELLED')}>Cancel</button>{['INVALIDATED','CANCELLED','EXPIRED'].includes(c.current_status)&&<button onClick={()=>setStatus(c,'PLANNED')}>Reactivate</button>}</div><div className="zoneActions"><button onClick={()=>openDecision(c,'TRADE')} className="decisionTrade">Trade</button><button onClick={()=>openDecision(c,'NO_TRADE')}>No-trade</button><button onClick={()=>openDecision(c,'MISSED')}>Missed</button><button onClick={()=>openEvidence(c)}>+ Evidence</button>{!quickMode&&<button onClick={()=>beginCandidateEdit(c)}>Revise zone</button>}</div>{(candidateDecisions[c.candidate_id]?.length??0)>0&&<small className="decisionCount">{candidateDecisions[c.candidate_id].length} decision(s) recorded</small>}</article>)}</div>
            <p className="locked">Confirmed records are never overwritten. Updates create new immutable revisions or timestamped events.</p>
          </div>

          {editing&&<div className="panel"><div className="panelTitle"><h2>Revise {editing.label||'zone'}</h2><button onClick={()=>setEditing(null)}>Close</button></div><div className="formGrid"><label>Intent<select value={editIntent} onChange={e=>setEditIntent(e.target.value)}>{['LONG','SHORT','CONDITIONAL','WATCH','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label>{editing.price_mode==='RANGE'&&<><label>From<input type="number" step={tickStep} value={editFrom??''} onChange={e=>setEditFrom(e.target.value?Number(e.target.value):null)}/></label><label>To<input type="number" step={tickStep} value={editTo??''} onChange={e=>setEditTo(e.target.value?Number(e.target.value):null)}/></label></>}{editing.price_mode==='SINGLE'&&<label>Price<input type="number" step={tickStep} value={editSingle??''} onChange={e=>setEditSingle(e.target.value?Number(e.target.value):null)}/></label>}<label>Reason for revision<textarea value={editReason} onChange={e=>setEditReason(e.target.value)} placeholder="Required"/></label></div><SourcePicker grouped={groupedSources} selected={editSourceIds} toggle={toggleEditSource}/><button className="primary" disabled={!editReason.trim()} onClick={saveCandidateRevision}>Save new zone revision</button></div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='DECISION'?'block':'none'}}>
          {decisionCandidate&&<div className="panel decisionPanel" id="journal-quick-decision"><div className="panelTitle"><div><h2>Decision · {decisionCandidate.label||'Zone'}</h2><p className="subtle">Quick mode records only what matters now. Detailed review can be completed later.</p></div><button onClick={()=>setDecisionCandidate(null)}>Close</button></div>
            <div className="fieldHelpLine"><b>Decision</b><FieldHelp id="decision.type" value={decisionType}/></div><div className="decisionChoice"><button className={decisionType==='TRADE'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>setDecisionType('TRADE')}>TRADE</button><button className={decisionType==='NO_TRADE'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>setDecisionType('NO_TRADE')}>NO-TRADE</button><button className={decisionType==='MISSED'?'decisionBig selectedDecision':'decisionBig'} onClick={()=>setDecisionType('MISSED')}>MISSED</button></div>
            {decisionType==='TRADE'&&<div className="formGrid"><label>Direction<select value={decisionDirection} onChange={e=>setDecisionDirection(e.target.value as 'LONG'|'SHORT')}><option>LONG</option><option>SHORT</option></select></label>{['LONG','SHORT'].includes(decisionCandidate.directional_intent)&&decisionDirection!==decisionCandidate.directional_intent&&<label className="warningField">Why are you going opposite to the plan?<select value={mismatchReason} onChange={e=>setMismatchReason(e.target.value)}><option value="">Select</option><option value="NEW_EVIDENCE">New evidence</option><option value="SCENARIO_INVALIDATED">Original scenario invalidated</option><option value="PLANNED_COUNTERTREND">Planned counter-trend setup</option><option value="PLAN_NOT_UPDATED">Plan not updated yet</option><option value="UNPLANNED_IMPULSE">Unplanned / impulsive</option><option value="OTHER">Other</option></select></label>}</div>}
            {decisionType==='NO_TRADE'&&<div data-validation-id="decision.reason" className={`quickReasons ${invalidClass('decision.reason')}`}><span>Why no trade? <FieldHelp id="decision.reason"/></span>{['MISSING_CONFIRMATION','CONTRADICTING_EVIDENCE','INVALIDATION','RISK_UNACCEPTABLE','CONTEXT_WRONG','RULE_PREVENTED','OTHER'].map(x=><button key={x} className={decisionReason===x?'chip selected':'chip'} onClick={()=>{setDecisionReason(x);clearValidation('decision.reason')}}>{x.replaceAll('_',' ')}</button>)}</div>}
            {decisionType==='MISSED'&&<div data-validation-id="decision.reason" className={`quickReasons ${invalidClass('decision.reason')}`}><span>Why missed? <FieldHelp id="decision.reason"/></span>{['HESITATION','DID_NOT_NOTICE','TOO_LATE','OPERATIONAL_ISSUE','DISTRACTED','RISK_LIMIT_REACHED','PLATFORM_ISSUE','OTHER'].map(x=><button key={x} className={decisionReason===x?'chip selected':'chip'} onClick={()=>{setDecisionReason(x);clearValidation('decision.reason')}}>{x.replaceAll('_',' ')}</button>)}</div>}
            {!quickMode&&<div className="formGrid"><label data-validation-id="decision.quality" className={invalidClass('decision.quality')}>Decision quality <FieldHelp id="decision.quality" value={decisionQuality}/><select value={decisionQuality} onChange={e=>{setDecisionQuality(e.target.value as any);clearValidation('decision.quality')}}><option value="">Complete later</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label>{isFieldPresented('decision.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>{fieldText['decision.note']?.label?.trim()||'Optional note'}{fieldText['decision.note']?.help&&<small title={fieldText['decision.note'].help}>ⓘ</small>}<textarea value={decisionNote} onChange={e=>setDecisionNote(e.target.value)} placeholder="Only if it adds useful context"/></label>}</div>}
            <div className="decisionSnapshot"><span><b>Planned intent</b>{decisionCandidate.directional_intent}</span><span><b>Status</b>{decisionCandidate.current_status}</span><span><b>Sources</b>{decisionCandidate.sources.slice(0,3).join(' · ')||'—'}</span></div>
            <div className="rowActions"><button onClick={()=>setDecisionCandidate(null)}>Cancel</button><button className="primary" onClick={saveDecision}>Save decision</button></div>
            {(candidateDecisions[decisionCandidate.candidate_id]??[]).length>0&&<details><summary>Previous decisions at this zone</summary>{candidateDecisions[decisionCandidate.candidate_id].slice(0,6).map(d=><div className="decisionHistory" key={d.decision_id}><time>{timeLabel(d.occurred_at)}</time><b>{d.decision_type}{d.intended_direction?` · ${d.intended_direction}`:''}</b><small>{d.reason_code||d.plan_alignment||'—'}</small></div>)}</details>}
          </div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='EVIDENCE'?'block':'none'}}>
          {evidenceCandidate&&<div className="panel"><div className="panelTitle"><div><h2>Quick evidence · {evidenceCandidate.label||'Zone'}</h2><p className="subtle">Capture what appeared now. Level provenance remains separate.</p></div><button onClick={()=>setEvidenceCandidate(null)}>Close</button></div><div className="evidencePicker">{groupedEvidence.map(([group,items])=><div className="sourceGroup" key={group}><strong>{group.replaceAll('_',' ')}</strong><div className="chips">{items.map(e=><button key={e.evidence_type_id} className={evidenceTypeId===e.evidence_type_id?'chip selected':'chip'} onClick={()=>setEvidenceTypeId(e.evidence_type_id)}>{e.label}</button>)}</div></div>)}</div><div className="formGrid"><label>Role<select value={evidenceRole} onChange={e=>setEvidenceRole(e.target.value as any)}><option value="SETUP_SUPPORT">Supporting evidence</option><option value="ENTRY_CONFIRMATION">Entry confirmation</option><option value="CONTRADICTING_EVIDENCE">Contradicting evidence</option><option value="INVALIDATION">Invalidation</option><option value="GENERAL_OBSERVATION">General observation</option></select></label><label>Direction<select value={evidenceDirection} onChange={e=>setEvidenceDirection(e.target.value as any)}><option>NEUTRAL</option><option>BUY</option><option>SELL</option></select></label>{isFieldPresented('evidence.price',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Price (optional)<input type="number" step={tickStep} value={evidencePrice??''} onChange={e=>setEvidencePrice(e.target.value?Number(e.target.value):null)}/></label>}{isFieldPresented('evidence.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>{fieldText['evidence.note']?.label?.trim()||'Note'}{fieldText['evidence.note']?.help&&<small title={fieldText['evidence.note'].help}>ⓘ</small>}<textarea value={evidenceNote} onChange={e=>setEvidenceNote(e.target.value)} placeholder="Optional"/></label>}</div><button className="primary" disabled={!evidenceTypeId} onClick={saveEvidence}>Capture evidence now</button><div className="evidenceHistory"><h3>Recent evidence</h3>{(candidateEvidence[evidenceCandidate.candidate_id]??[]).slice(0,8).map(ev=><div className="evidenceRow" key={ev.evidence_id}><time>{timeLabel(ev.occurred_at)}</time><div><b>{ev.evidence_label}</b><small>{ev.role} · {ev.direction||'—'}{ev.price!=null?` · ${ev.price}`:''}</small>{ev.note&&<span>{ev.note}</span>}</div></div>)}</div></div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='EXECUTION'?'block':'none'}}>
          {pendingTradeDecision&&<div className="panel executionPanel" id="journal-quick-entry"><div className="panelTitle"><div><h2>Quick trade entry</h2><p className="subtle">Only the essentials now. Review can be completed later.</p></div><button onClick={()=>setPendingTradeDecision(null)}>Close</button></div><div className="formGrid"><label data-validation-id="trade.entryPrice" className={invalidClass('trade.entryPrice')}>Entry price <FieldHelp id="trade.entryPrice"/> <small>Full market price</small><input type="number" step={tickStep} value={entryPrice??''} onChange={e=>{setEntryPrice(e.target.value?Number(e.target.value):null);clearValidation('trade.entryPrice')}} placeholder="e.g. 6025.25"/></label><label data-validation-id="trade.stopPrice" className={invalidClass('trade.stopPrice')}>Initial stop price <FieldHelp id="trade.stopPrice"/> <small>Full market price</small><input type="number" step={tickStep} value={stopPrice??''} onChange={e=>{setStopPrice(e.target.value?Number(e.target.value):null);clearValidation('trade.stopPrice')}} placeholder="e.g. 6022.25"/></label><label data-validation-id="trade.quantity" className={invalidClass('trade.quantity')}>Quantity <FieldHelp id="trade.quantity"/><input type="number" min="1" step="1" value={tradeQty} onChange={e=>{setTradeQty(Number(e.target.value)||1);clearValidation('trade.quantity')}}/></label><label data-validation-id="trade.plannedTarget" className={invalidClass('trade.plannedTarget')}>Planned target <RequirementBadge id="trade.plannedTarget" overrides={requirementOverrides}/> <FieldHelp id="trade.plannedTarget"/><input type="number" step={tickStep} value={plannedTarget??''} onChange={e=>{setPlannedTarget(e.target.value?Number(e.target.value):null);clearValidation('trade.plannedTarget')}}/></label></div><button className="primary" disabled={entryPrice==null||stopPrice==null||tradeQty<=0} onClick={createExecutedTrade}>Open trade</button></div>}

          {sessionTrades.length>0&&<div id="journal-session-trades" className="panel"><div className="panelTitle"><div><h2>Trades this session</h2><p className="subtle">Quick operational view — detailed review stays separate.</p></div></div><div className="tradeList">{sessionTrades.map(t=><button className="tradeRow" key={t.trade_id} onClick={()=>openTradeDetail(t)}><b>{t.direction}</b><span>{t.status}</span><span>Qty open {t.open_quantity}</span><span>{t.realized_r==null?'R —':`${t.realized_r.toFixed(2)}R`}</span></button>)}</div></div>}

          {activeTrade&&<div className="panel executionPanel"><div className="panelTitle"><div><h2>Open trade / execution</h2><p className="subtle">{activeTrade.metrics.direction} · {activeTrade.metrics.status}</p></div><button onClick={()=>setActiveTrade(null)}>Close</button></div><div className="summaryStrip"><span><b>Avg entry</b>{activeTrade.metrics.average_entry?.toFixed(2)??'—'}</span><span><b>Open qty</b>{activeTrade.metrics.open_quantity}</span><span><b>Stop</b>{activeTrade.metrics.latest_stop_price?.toFixed(2)??'—'}</span><span><b>Initial risk</b>{activeTrade.metrics.initial_risk_dollars==null?'—':`$${activeTrade.metrics.initial_risk_dollars.toFixed(2)}`}</span><span><b>Realized</b>{activeTrade.metrics.realized_r==null?'—':`${activeTrade.metrics.realized_r.toFixed(2)}R`}</span></div>{activeTrade.metrics.status!=='CLOSED'&&<><div className="executionActions"><div><h3>Add fill</h3><div className="formGrid"><label>Action<select value={fillAction} onChange={e=>setFillAction(e.target.value as 'ENTRY'|'EXIT')}><option value="EXIT">Partial / full exit</option><option value="ENTRY">Additional entry</option></select></label><label>Price<input type="number" step={tickStep} value={fillPrice??''} onChange={e=>setFillPrice(e.target.value?Number(e.target.value):null)}/></label><label>Qty<input type="number" min="1" value={fillQty} onChange={e=>setFillQty(Number(e.target.value)||1)}/></label><label>Reason <small>Optional</small><input value={fillReason} onChange={e=>setFillReason(e.target.value)} placeholder="Target / risk reduction / other"/></label></div><button disabled={fillSaving||fillPrice==null} onClick={addFill}>{fillSaving?'Saving fill…':'Save fill'}</button>{fillFeedback&&<p role="status" aria-live="polite" className="exportMessage">{fillFeedback}</p>}</div><div><h3>Move stop</h3><div className="formGrid"><label>New stop<input type="number" step={tickStep} value={newStop??''} onChange={e=>setNewStop(e.target.value?Number(e.target.value):null)}/></label><label>Reason <small>Optional</small><input value={stopReason} onChange={e=>setStopReason(e.target.value)} placeholder="BE / structure / trail / other"/></label></div><button onClick={moveStop}>Save stop change</button></div></div></>}<AttachmentPanel ownerType="TRADE" ownerId={activeTrade.metrics.trade_id} defaultStage={activeTrade.metrics.status==='CLOSED'?'POST_EXIT':'DURING'} title={activeTrade.metrics.status==='CLOSED'?'Post-exit screenshot':'Trade screenshot'} compact /><details open><summary>Execution timeline</summary>{activeTrade.fills.map(f=><div className="decisionHistory" key={f.execution_id}><time>{f.occurred_at?timeLabel(f.occurred_at):'—'}</time><b>{f.action} · {f.side}</b><small>{f.quantity} @ {f.price.toFixed(2)}{f.note?` · ${f.note}`:''}</small></div>)}</details>{activeTrade.metrics.status==='CLOSED'&&<div className="postReview"><h3>Quick post-trade review</h3><p className="subtle">Keep it short. Detailed fields only open when useful.</p>{tradeReview?.status==='COMPLETED'?<div className="locked">Review completed and locked.</div>:<><div className="formGrid"><label data-validation-id="review.decisionQuality" className={invalidClass('review.decisionQuality')}>Decision quality <FieldHelp id="review.decisionQuality" value={reviewDecisionQuality}/><select value={reviewDecisionQuality} onChange={e=>{setReviewDecisionQuality(e.target.value as any);clearValidation('review.decisionQuality')}}><option value="">Complete later</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label><label data-validation-id="review.executionQuality" className={invalidClass('review.executionQuality')}>Execution <FieldHelp id="review.executionQuality" value={reviewExecutionQuality}/><select value={reviewExecutionQuality} onChange={e=>{setReviewExecutionQuality(e.target.value as any);clearValidation('review.executionQuality')}}><option value="">Optional</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="UNCLEAR">Unclear</option></select></label><label data-validation-id="review.managementQuality" className={invalidClass('review.managementQuality')}>Management <FieldHelp id="review.managementQuality" value={reviewManagementQuality}/><select value={reviewManagementQuality} onChange={e=>{setReviewManagementQuality(e.target.value as any);clearValidation('review.managementQuality')}}><option value="">Optional</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="UNCLEAR">Unclear</option></select></label>{isFieldPresented('review.exitReason',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Exit reason<select value={reviewExitReason} onChange={e=>setReviewExitReason(e.target.value)}><option value="">Optional</option>{['TARGET','STOP','SETUP_INVALIDATED','PRICE_ACTION_CHANGED','RISK_REDUCTION','EARLY_EXIT','FEAR','TIME_BASED','OTHER'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>}</div><div data-validation-id="psychology.emotionAffected" className={`psychQuick ${invalidClass('psychology.emotionAffected')}`}><strong>Did emotion affect this trade? <FieldHelp id="psychology.emotionAffected" value={emotionAffected===true?'YES':emotionAffected===false?'NO':''}/></strong><div className="rowActions"><button className={emotionAffected===false?'selectedButton':''} onClick={()=>{setEmotionAffected(false);setPsychState('');setPsychIntensity(null);setPsychStage('');clearValidation('psychology.emotionAffected');clearValidation('psychology.state');clearValidation('psychology.stage')}}>No</button><button className={emotionAffected===true?'selectedButton':''} onClick={()=>{setEmotionAffected(true);clearValidation('psychology.emotionAffected')}}>Yes</button></div>{emotionAffected===true&&<div className="formGrid"><label data-validation-id="psychology.state" className={invalidClass('psychology.state')}>Main state <FieldHelp id="psychology.state" value={psychState}/><select value={psychState} onChange={e=>{setPsychState(e.target.value);clearValidation('psychology.state')}}><option value="">Choose</option>{['FEAR','FOMO','FRUSTRATION','REVENGE','HESITATION','OVERCONFIDENCE','OTHER'].map(x=><option key={x}>{x}</option>)}</select></label><label data-validation-id="psychology.stage" className={invalidClass('psychology.stage')}>Affected stage <FieldHelp id="psychology.stage" value={psychStage}/><select value={psychStage} onChange={e=>{setPsychStage(e.target.value as any);clearValidation('psychology.stage')}}><option value="">Choose</option><option>ENTRY</option><option>MANAGEMENT</option><option>EXIT</option><option>MULTIPLE</option></select></label><label>Intensity <small>Optional</small><select value={psychIntensity??''} onChange={e=>setPsychIntensity(e.target.value?Number(e.target.value):null)}><option value="">—</option>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label></div>}</div><div className="psychQuick"><strong>Any rule broken?</strong><div className="rowActions"><button className={ruleViolationReported===false?'selectedButton':''} onClick={()=>{setRuleViolationReported(false);setViolatedRuleIds([])}}>No</button><button className={ruleViolationReported===true?'selectedButton':''} onClick={()=>setRuleViolationReported(true)}>Yes</button></div>{ruleViolationReported===true&&<><div className="chips">{rules.filter(r=>r.scope==='TRADE'||r.scope==='BOTH').map(r=><button type="button" key={r.rule_version_id} className={violatedRuleIds.includes(r.rule_version_id)?'chip selected':'chip'} onClick={()=>toggleRuleViolation(r.rule_version_id)}>{r.label}</button>)}</div>{isFieldPresented('rule.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Rule note <small>Optional</small><input value={ruleNote} onChange={e=>setRuleNote(e.target.value)} placeholder="Only if useful"/></label>}</>}</div><details><summary>Mistakes / advanced review</summary><div className="sourceGroups">{Object.entries(mistakeTypes.reduce<Record<string,MistakeType[]>>((a,m)=>((a[m.mistake_group]??=[]).push(m),a),{})).map(([g,items])=><div className="sourceGroup" key={g}><strong>{g}</strong><div className="chips">{items.map(m=><button type="button" className={reviewMistakes.includes(m.mistake_type_id)?'chip selected':'chip'} onClick={()=>toggleReviewMistake(m.mistake_type_id)} key={m.mistake_type_id}>{m.label}</button>)}</div></div>)}</div><div className="formGrid">{isFieldPresented('review.exitNote',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Exit note<textarea value={reviewExitNote} onChange={e=>setReviewExitNote(e.target.value)} placeholder="Only if useful"/></label>}{isFieldPresented('review.note',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>Review note<textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Optional"/></label>}</div></details><div className="rowActions"><button onClick={()=>saveReview(false)}>Save draft</button><button className="primary" onClick={()=>saveReview(true)}>Complete review</button></div></>}</div>}</div>}

          </div>
          <div style={{display:!quickMode||notebookPage==='REVIEW'?'block':'none'}}>
          <div id="journal-session-review" className="panel"><div className="panelTitle"><div><h2>Session review</h2><p className="subtle">Mostly derived. Only add the lessons that are worth remembering.</p></div><button onClick={openSessionReview}>{showSessionReview?'Refresh summary':'End session / review'}</button></div>{showSessionReview&&<>{sessionReviewSummary&&<div className="summaryStrip"><span><b>Trades</b>{sessionReviewSummary.trade_count}</span><span><b>Net R</b>{sessionReviewSummary.net_r==null?'—':`${sessionReviewSummary.net_r.toFixed(2)}R`}</span><span><b>No-trade</b>{sessionReviewSummary.no_trade_count}</span><span><b>Missed</b>{sessionReviewSummary.missed_count}</span><span><b>Rule violations</b>{sessionReviewSummary.rule_violation_count}</span></div>}{sessionReview?.status==='COMPLETED'?<div className="locked"><strong>Session review completed and locked.</strong><p>Saved review answers (read-only):</p>{([['What went well?',sessionReview.what_went_well],['One thing to improve next session',sessionReview.next_improvement],['Overall',sessionReview.overall_assessment],['What went poorly?',sessionReview.what_went_poorly],['Best decision',sessionReview.best_decision],['Biggest mistake',sessionReview.biggest_mistake],['Market learning',sessionReview.market_learning],['Plan quality',sessionReview.plan_quality],['Discipline',sessionReview.discipline]] as Array<[string,string|null|undefined]>).filter(([,v])=>Boolean(v)).map(([k,v])=><p key={k}><b>{k}</b>: {v}</p>)}</div>:<><div className="formGrid">{orderFieldIdsWithinSection(['sessionReview.wentWell','sessionReview.nextImprovement'],fieldOrder).map(id=>
  id==='sessionReview.wentWell'
    ?(isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label key={id}>{fieldText['sessionReview.wentWell']?.label?.trim()||'What went well?'} <small>Optional</small>{fieldText['sessionReview.wentWell']?.help&&<small title={fieldText['sessionReview.wentWell'].help}>ⓘ</small>}<textarea value={srWentWell} onChange={e=>setSrWentWell(e.target.value)} /></label>)
    :(isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label key={id}>{fieldText['sessionReview.nextImprovement']?.label?.trim()||'One thing to improve next session'} <small>Recommended</small>{fieldText['sessionReview.nextImprovement']?.help&&<small title={fieldText['sessionReview.nextImprovement'].help}>ⓘ</small>}<textarea value={srNextImprovement} onChange={e=>setSrNextImprovement(e.target.value)} /></label>)
)}<label>Overall<select value={srOverall} onChange={e=>setSrOverall(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label></div><details><summary>Detailed daily review · optional</summary><div className="formGrid">{orderFieldIdsWithinSection(['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'],fieldOrder).map(id=>
  isFieldPresented(id,quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&(
    id==='sessionReview.wentPoorly'?<label key={id}>{fieldText['sessionReview.wentPoorly']?.label?.trim()||'What went poorly?'}{fieldText['sessionReview.wentPoorly']?.help&&<small title={fieldText['sessionReview.wentPoorly'].help}>ⓘ</small>}<textarea value={srWentPoorly} onChange={e=>setSrWentPoorly(e.target.value)} /></label>:
    id==='sessionReview.bestDecision'?<label key={id}>{fieldText['sessionReview.bestDecision']?.label?.trim()||'Best decision'}{fieldText['sessionReview.bestDecision']?.help&&<small title={fieldText['sessionReview.bestDecision'].help}>ⓘ</small>}<textarea value={srBestDecision} onChange={e=>setSrBestDecision(e.target.value)} /></label>:
    id==='sessionReview.biggestMistake'?<label key={id}>{fieldText['sessionReview.biggestMistake']?.label?.trim()||'Biggest mistake'}{fieldText['sessionReview.biggestMistake']?.help&&<small title={fieldText['sessionReview.biggestMistake'].help}>ⓘ</small>}<textarea value={srBiggestMistake} onChange={e=>setSrBiggestMistake(e.target.value)} /></label>:
    <label key={id}>{fieldText['sessionReview.marketLearning']?.label?.trim()||'What did the market teach me?'}{fieldText['sessionReview.marketLearning']?.help&&<small title={fieldText['sessionReview.marketLearning'].help}>ⓘ</small>}<textarea value={srMarketLearning} onChange={e=>setSrMarketLearning(e.target.value)} /></label>
  )
)}<label>Plan quality<select value={srPlanQuality} onChange={e=>setSrPlanQuality(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label><label>Discipline<select value={srDiscipline} onChange={e=>setSrDiscipline(e.target.value as any)}><option value="">—</option><option value="GOOD">Good</option><option value="ACCEPTABLE">Acceptable</option><option value="NEEDS_IMPROVEMENT">Needs improvement</option><option value="NA">N/A</option></select></label></div></details><div className="rowActions"><button onClick={()=>saveSessionReview(false)}>Save draft</button><button className="primary" disabled={(sessionReviewSummary?.open_trade_count??0)>0} onClick={()=>saveSessionReview(true)}>Complete & close session</button></div>{(sessionReviewSummary?.open_trade_count??0)>0&&<p className="subtle">Close or resolve open trades before completing the session.</p>}</>}</>}</div>

          <div className="panel"><h2>Plan history</h2><div className="timeline">{timeline.length===0?<p className="subtle">No events yet.</p>:timeline.map((e,i)=><div className="timelineRow" key={`${e.occurred_at}-${i}`}><time>{timeLabel(e.occurred_at)}</time><div><strong>{e.title}</strong>{e.detail&&<p>{e.detail}</p>}<small>{e.event_type}</small></div></div>)}</div></div>
          </div>
        </>}
        </>}
      </section>

      {!showAnalysis&&<aside className="currentPanel"><strong>CURRENT PLAN</strong>{plan?<><span>{plan.initial_bias} · Rev {plan.revision_number}</span>{longZones.length>0&&<div className="miniGroup"><b>BUY</b>{longZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}{shortZones.length>0&&<div className="miniGroup"><b>SHORT</b>{shortZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}{conditionalZones.length>0&&<div className="miniGroup"><b>CONDITIONAL / WATCH</b>{conditionalZones.map(c=><MiniZone key={c.candidate_id} c={c}/>)}</div>}<small>Updated {timeLabel(plan.created_at)}</small></>:<span>No confirmed plan</span>}</aside>}
    </div>
  </main>;
}


function AnalyticsPanel({filter,patchFilter,apply,rows,summary,mistakes,sources,evidenceTypes,openTrade}:{filter:JournalFilter;patchFilter:(p:Partial<JournalFilter>)=>void;apply:()=>void;rows:JournalTradeRow[];summary:AnalyticsSummary|null;mistakes:MistakeSummary[];sources:LevelSourceType[];evidenceTypes:EvidenceType[];openTrade:(id:string)=>void}){
  const [exportMessage,setExportMessage]=useState('');
  const fmt=(v:number|null|undefined,d=2)=>v==null?'—':v.toFixed(d);
  return <><div className="panel"><div className="panelTitle"><div><h2>Analyze</h2><p className="subtle">Separate from live trading. Filters use structured journal data only.</p></div><div className="headerActions"><button onClick={async()=>{try{const r=await localApi.exportJournalHtml(filter);setExportMessage(`Readable report saved: ${r.path}`)}catch(e){setExportMessage(String(e))}}}>Readable report</button><button onClick={async()=>{try{const r=await localApi.exportJournalCsv(filter);setExportMessage(`CSV saved: ${r.path}`)}catch(e){setExportMessage(String(e))}}}>CSV</button><button onClick={async()=>{try{await localApi.openExportFolder()}catch(e){setExportMessage(`Could not open export folder: ${String(e)}`)}}}>Open export folder</button><button className="primary" onClick={apply}>Apply filters</button></div></div>{exportMessage&&<p className="subtle exportMessage">{exportMessage}</p>}<div className="formGrid"><label>From<input type="date" value={filter.date_from??''} onChange={e=>patchFilter({date_from:e.target.value||null})}/></label><label>To<input type="date" value={filter.date_to??''} onChange={e=>patchFilter({date_to:e.target.value||null})}/></label><label>Instrument<select value={filter.instrument_symbol??''} onChange={e=>patchFilter({instrument_symbol:e.target.value||null})}><option value="">All</option>{Array.from(new Set(rows.map(r=>r.instrument_symbol))).sort().map(x=><option key={x}>{x}</option>)}</select></label><label>Direction<select value={filter.direction??''} onChange={e=>patchFilter({direction:e.target.value||null})}><option value="">All</option><option>LONG</option><option>SHORT</option></select></label><label>Decision quality<select value={filter.decision_quality??''} onChange={e=>patchFilter({decision_quality:e.target.value||null})}><option value="">All</option>{['A','B','C','INVALID','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label><label>Rule status<select value={filter.rule_status??''} onChange={e=>patchFilter({rule_status:(e.target.value||null) as any})}><option value="">All</option><option value="FOLLOWED">No violation recorded</option><option value="VIOLATED">Violation</option><option value="UNCHECKED">Unchecked</option></select></label><label>Level source<select value={filter.level_source_type_id??''} onChange={e=>patchFilter({level_source_type_id:e.target.value||null})}><option value="">All</option>{sources.map(x=><option value={x.source_type_id} key={x.source_type_id}>{x.label}</option>)}</select></label><label>Evidence<select value={filter.evidence_type_id??''} onChange={e=>patchFilter({evidence_type_id:e.target.value||null})}><option value="">All</option>{evidenceTypes.map(x=><option value={x.evidence_type_id} key={x.evidence_type_id}>{x.label}</option>)}</select></label></div></div>
  {summary&&<div className="panel"><div className="panelTitle"><div><h2>Performance summary</h2><p className="subtle">Metrics use only trades with sufficient data for each calculation.</p></div></div>{summary.small_sample&&<div className="warningBox">Small sample: only {summary.eligible_r_count} trade(s) have valid R. Interpret results cautiously.</div>}<div className="summaryStrip"><span><b>N</b>{summary.trade_count}</span><span><b>R-eligible</b>{summary.eligible_r_count}</span><span><b>Win rate</b>{summary.win_rate==null?'—':`${fmt(summary.win_rate,1)}%`}</span><span><b>Avg R</b>{fmt(summary.average_r)}R</span><span><b>Net R</b>{fmt(summary.net_r)}R</span><span><b>Expectancy</b>{fmt(summary.expectancy_r)}R</span><span><b>Profit factor</b>{fmt(summary.profit_factor_r)}</span><span><b>Net P&L</b>{summary.net_pnl==null?'—':`$${fmt(summary.net_pnl)}`}</span></div><div className="summaryStrip"><span><b>Avg winner</b>{fmt(summary.average_winner_r)}R</span><span><b>Avg loser</b>{fmt(summary.average_loser_r)}R</span><span><b>Median R</b>{fmt(summary.median_r)}R</span><span><b>Rule violation trades</b>{summary.rule_violation_trades}</span><span className={summary.bad_decision_win_count>0?'warningCell':''}><b>Bad decision + win</b>{summary.bad_decision_win_count}</span></div></div>}
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

function focusRequiredCustomField(fieldId:string){
  const target=document.getElementById('custom-required-'+fieldId);
  target?.scrollIntoView({behavior:'smooth',block:'center'});
  target?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')?.focus({preventScroll:true});
}
function SessionCustomSelections({sessionId,quickMode}:{sessionId:string;quickMode:boolean}){
  const [fields,setFields]=useState<import('./services/localApi').CustomFieldDefinition[]>([]);
  const [options,setOptions]=useState<Record<string,import('./services/localApi').CustomFieldOption[]>>({});
  const [selected,setSelected]=useState<Record<string,string[]>>({});
  const [notice,setNotice]=useState('');
  const [original,setOriginal]=useState<Record<string,string[]>>({});
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let live=true;
    setFields([]);setOptions({});setSelected({});setOriginal({});setNotice('');
    localApi.listCustomFieldDefinitions().then(async defs=>{
      const eligible=defs.filter(f=>f.active&&f.stage==='session'&&['SINGLE_SELECT','MULTI_SELECT'].includes(f.field_type));
      const pairs=await Promise.all(eligible.map(async f=>{
        const [opts,current]=await Promise.all([localApi.listCustomFieldOptions(f.field_id),localApi.currentCustomFieldSelection('session',sessionId,f.field_id)]);
        return {id:f.field_id,opts,value:current?.options.map(o=>o.option_id)||[]};
      }));
      if(live){setFields(eligible);setOptions(Object.fromEntries(pairs.map(p=>[p.id,p.opts])));setSelected(Object.fromEntries(pairs.map(p=>[p.id,p.value])));setOriginal(Object.fromEntries(pairs.map(p=>[p.id,p.value])));}
    }).catch(e=>{if(live)setNotice('Custom fields unavailable: '+String(e));});
    return ()=>{live=false;};
  },[sessionId]);
  async function save(fieldId:string){
    const values=selected[fieldId]||[];if(values.length===0||busy)return;
    if(values.length===(original[fieldId]||[]).length&&values.every(v=>(original[fieldId]||[]).includes(v))){setNotice('No change to save.');return;}
    setBusy(true);
    try {
      await localApi.recordCustomFieldSelection({event_id:crypto.randomUUID(),field_id:fieldId,owner_stage:'session',owner_id:sessionId,option_ids:values});
      const current=await localApi.currentCustomFieldSelection('session',sessionId,fieldId);
      setOriginal(v=>({...v,[fieldId]:values}));
      setNotice('Saved: '+(current?.options.map(o=>o.label_at_selection).join(', ')||''));
    }catch(e){setNotice('Not saved: '+String(e));}
    finally{setBusy(false);}
  }
  if(!fields.length&&!notice)return null;
  const missing=fields.filter(f=>f.required&&(original[f.field_id]||[]).length===0);
  return <details className="guidedMore" open={quickMode&&missing.length>0}><summary>Session custom fields {missing.length>0?`· ${missing.length} required missing`:''}</summary>
    <p className="subtle">Save required choices before completing the Session stage. Unsaved changes do not count as completed.</p>
    {missing.length>0&&<div role="status" className="subtle">Required, not saved: {missing.map(f=><button type="button" key={f.field_id} onClick={()=>focusRequiredCustomField(f.field_id)}>{f.label}</button>)}</div>}
    {fields.map(field=>{
      const values=selected[field.field_id]||[];
      const available=options[field.field_id]||[];
      const same=values.length===(original[field.field_id]||[]).length&&values.every(v=>(original[field.field_id]||[]).includes(v));
      const valid=!same&&values.length>0&&values.length<=100&&values.every(id=>available.some(o=>o.option_id===id&&o.active));
      return <div id={`custom-required-${field.field_id}`} key={field.field_id} className="requirementGroup">
        <b>{field.label}{field.required?' · Required':''}</b>{field.help_text&&<p className="subtle">{field.help_text}</p>}
        {field.field_type==='SINGLE_SELECT'
          ? <select aria-label={field.label} value={values[0]||''} onChange={e=>setSelected(v=>({...v,[field.field_id]:e.target.value?[e.target.value]:[]}))}>
            <option value="">Select an option</option>
            {available.filter(o=>o.active||values.includes(o.option_id)).map(o=><option value={o.option_id} key={o.option_id}>{o.label}{o.active?'':' (inactive)'}</option>)}
          </select>
          : <div>{available.filter(o=>o.active||values.includes(o.option_id)).map(o=><label key={o.option_id}>
            <input type="checkbox" checked={values.includes(o.option_id)} disabled={!o.active&&!values.includes(o.option_id)}
              onChange={e=>setSelected(v=>({...v,[field.field_id]:e.target.checked?[...values,o.option_id]:values.filter(id=>id!==o.option_id)}))}/>
            {o.label}{o.active?'':' (inactive)'}
          </label>)}</div>}
        <button type="button" disabled={busy||!valid} onClick={()=>save(field.field_id)}>Save selection</button>
      </div>;
    })}
    {notice&&<p role="status" className="subtle">{notice}</p>}
  </details>;
}


function SessionTypedCustomFields({sessionId,quickMode}:{sessionId:string;quickMode:boolean}){
  const [fields,setFields]=useState<import('./services/localApi').CustomFieldDefinition[]>([]);
  const [values,setValues]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [original,setOriginal]=useState<Record<string,string>>({});
  useEffect(()=>{
    let current=true;
    setFields([]);setValues({});setOriginal({});setMessage('');
    localApi.listCustomFieldDefinitions().then(async all=>{
      const eligible=all.filter(f=>f.active&&f.stage==='session'&&['TEXT','NUMBER','DATE','BOOLEAN'].includes(f.field_type));
      const entries=await Promise.all(eligible.map(async f=>{
        const value=await localApi.currentCustomFieldTypedValue('session',sessionId,f.field_id);
        const display=value?.value_type==='BOOLEAN' ? (value.boolean_value===true?'true':value.boolean_value===false?'false':'') :
          value?.value_type==='NUMBER' ? (value.number_value==null?'':String(value.number_value)) :
          value?.value_type==='DATE' ? (value.date_value||'') : (value?.text_value||'');
        return [f.field_id,display] as const;
      }));
      if(current){setFields(eligible);setValues(Object.fromEntries(entries));setOriginal(Object.fromEntries(entries));}
    }).catch(e=>{if(current)setMessage('Typed fields unavailable: '+String(e));});
    return ()=>{current=false;};
  },[sessionId]);
  async function save(field:import('./services/localApi').CustomFieldDefinition){
    const raw=values[field.field_id]??'';
    if(raw===original[field.field_id]){setMessage('No change to save.');return;}
    const number=field.field_type==='NUMBER'?Number(raw):null;
    if(!raw.trim()||(field.field_type==='NUMBER'&&!Number.isFinite(number)))return;
    setBusy(true);
    try{
      await localApi.recordCustomFieldTypedValue({
        event_id:crypto.randomUUID(),field_id:field.field_id,owner_stage:'session',owner_id:sessionId,
        text_value:field.field_type==='TEXT'?raw:null,
        number_value:field.field_type==='NUMBER'?number:null,
        date_value:field.field_type==='DATE'?raw:null,
        boolean_value:field.field_type==='BOOLEAN'?raw==='true':null
      });
      setOriginal(v=>({...v,[field.field_id]:raw}));
      setMessage(field.label+' saved; earlier values remain in history.');
    }catch(e){setMessage('Not saved: '+String(e));}
    finally{setBusy(false);}
  }
  if(!fields.length&&!message)return null;
  const missing=fields.filter(f=>f.required&&!(original[f.field_id]??'').trim());
  return <details className="guidedMore" open={quickMode&&missing.length>0}><summary>Session custom text, number, date and yes/no {missing.length>0?`· ${missing.length} required missing`:''}</summary>
    <p className="subtle">Save required values before completing the Session stage. Unsaved changes do not count as completed.</p>
    {missing.length>0&&<div role="status" className="subtle">Required, not saved: {missing.map(f=><button type="button" key={f.field_id} onClick={()=>focusRequiredCustomField(f.field_id)}>{f.label}</button>)}</div>}
    {fields.map(f=><div id={`custom-required-${f.field_id}`} className="requirementGroup" key={f.field_id}>
      <label>{f.label}{f.required?' · Required':''}
        {f.field_type==='BOOLEAN'
          ?<select value={values[f.field_id]??''} onChange={e=>setValues(v=>({...v,[f.field_id]:e.target.value}))}><option value="">Choose</option><option value="true">Yes</option><option value="false">No</option></select>
          :<input type={f.field_type==='DATE'?'date':f.field_type==='NUMBER'?'number':'text'} value={values[f.field_id]??''} onChange={e=>setValues(v=>({...v,[f.field_id]:e.target.value}))}/>}
      </label>
      {f.help_text&&<p className="subtle">{f.help_text}</p>}
      <button type="button" disabled={busy||!(values[f.field_id]??'').trim()||(values[f.field_id]??'')===(original[f.field_id]??'')||(f.field_type==='NUMBER'&&!Number.isFinite(Number(values[f.field_id])))} onClick={()=>save(f)}>Save value</button>
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
      <label>Label<input value={newField.label} maxLength={240} onChange={e=>setNewField(v=>({...v,label:e.target.value}))}/></label>
      <label>Stage<select value={newField.stage} onChange={e=>setNewField(v=>({...v,stage:e.target.value}))}>{['session','premarket-plan','candidate','zone','trade','execution','post-trade-review','session-review'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Type<select value={newField.field_type} onChange={e=>setNewField(v=>({...v,field_type:e.target.value}))}>{['TEXT','NUMBER','DATE','BOOLEAN','SINGLE_SELECT','MULTI_SELECT'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Help text<input value={newField.help_text} maxLength={240} onChange={e=>setNewField(v=>({...v,help_text:e.target.value}))}/></label>
      <button type="button" disabled={busy||!newField.label.trim()} onClick={()=>runChange(async()=>{
        await localApi.createCustomFieldDefinition({field_id:newId(),stage:newField.stage,field_type:newField.field_type,label:newField.label,help_text:newField.help_text,required:false,display_order:fields.length});
        setNewField(v=>({...v,label:'',help_text:''}));
      })}>Create field</button>
    </div>
    <label>Search fields<input type="search" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
    <label><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Show inactive</label>
    {visibleFields.map(field=><div className="requirementGroup" key={field.field_id}>
      <b>{field.label}</b> <small>({field.field_type} · {field.stage} · {field.active?'Active':'Inactive'})</small>
      <p className="subtle">ID: {field.field_id} · {field.help_text||'No help text'} · {field.required?'Required':'Optional'}</p>
      <label><input type="checkbox" checked={field.required} disabled={busy||!field.active} onChange={e=>{void runChange(()=>localApi.editCustomFieldDefinition(field.field_id,field.label,field.help_text,e.target.checked,field.active,field.display_order));}}/> Required at this stage</label>
      <button type="button" disabled={busy} onClick={()=>runChange(()=>localApi.editCustomFieldDefinition(field.field_id,field.label,field.help_text,field.required,!field.active,field.display_order))}>{field.active?'Deactivate':'Reactivate'}</button>
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
  const [textDraft,setTextDraft]=useState<Record<string,{label?:string;help?:string}>>(fieldText);
  useEffect(()=>setTextDraft(fieldText),[fieldText]);
  useEffect(()=>setDraft(overrides),[overrides]);

  async function save(next:RequirementOverrides){
    try{
      setDraft(next);
      await localApi.saveFieldRequirementOverrides(next);
      await onChanged();
      setMsg('Field requirements saved.');
    }catch(e){setMsg(String(e));}
  }
  async function toggle(id:string){
    const def=FIELD_DEFINITION_BY_ID[id];
    if(!def||def.systemLocked)return;
    const next={...draft,[id]:!draft[id]};
    if(!next[id])delete next[id];
    await save(next);
  }
  async function reset(){await save({});setMsg('Field requirements reset to lightweight defaults.');}
  async function togglePlacement(id:string){
    if(!isActiveVisibilityControl(id)||isUserRequired(id,draft))return;
    const next:Record<string,FieldPlacement>={...placements,[id]:placements[id]==='DETAILED_ONLY'?'QUICK_AND_DETAILED':'DETAILED_ONLY'};
    try{await localApi.saveFieldPlacementPreferences(next);await onPlacementChanged();setMsg('Quick/Detailed placement saved. Existing journal values are unchanged.');}
    catch(e){setMsg(String(e));}
  }
  async function toggleVisible(id:string){
    if(!isActiveVisibilityControl(id))return;
    const next={...visibility,[id]:!isFieldShown(id,visibility,draft)};
    try{await localApi.saveFieldVisibilityPreferences(next);await onVisibilityChanged();setMsg('Visibility preference saved. Existing values retained.');}
    catch(e){setMsg(String(e));}
  }
  async function saveTextSettings(){
    try{
      await localApi.saveFieldTextPreferences(textDraft);
      await onFieldTextChanged();
      setMsg('Field labels/help saved. Field IDs and existing records remain unchanged.');
    }catch(e){setMsg(String(e));}
  }
  async function moveSessionReflection(id:string,direction:-1|1){
    const section=id==='sessionReview.wentWell'||id==='sessionReview.nextImprovement' ? ['sessionReview.wentWell','sessionReview.nextImprovement'] : ['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'];
    const ids=orderFieldIdsWithinSection(section,order);
    const at=ids.indexOf(id), target=at+direction;
    if(at<0||target<0||target>=ids.length)return;
    [ids[at],ids[target]]=[ids[target],ids[at]];
    const next={...order,...Object.fromEntries(ids.map((field,index)=>[field,index]))};
    try{await localApi.saveFieldOrderPreferences(next);await onOrderChanged();setMsg('Session reflection order saved. Existing journal values are unchanged.');}
    catch(e){setMsg(String(e));}
  }
  async function movePlanScenario(id:string,direction:-1|1){
    const ids=orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],order);
    const at=ids.indexOf(id),nextAt=at+direction;
    if(at<0||nextAt<0||nextAt>=ids.length)return;
    [ids[at],ids[nextAt]]=[ids[nextAt],ids[at]];
    try{
      await localApi.saveFieldOrderPreferences({...order,...Object.fromEntries(ids.map((key,index)=>[key,index]))});
      await onOrderChanged();setMsg('Plan scenario order saved. Historical plan data are unchanged.');
    }catch(e){setMsg(String(e));}
  }
  async function moveZoneCondition(id:string,direction:-1|1){
    const ids=orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],order);
    const at=ids.indexOf(id),nextAt=at+direction;
    if(at<0||nextAt<0||nextAt>=ids.length)return;
    [ids[at],ids[nextAt]]=[ids[nextAt],ids[at]];
    try{
      await localApi.saveFieldOrderPreferences({...order,...Object.fromEntries(ids.map((key,index)=>[key,index]))});
      await onOrderChanged();setMsg('Zone condition order saved. Recorded plan values are unchanged.');
    }catch(e){setMsg(String(e));}
  }
  const groups=['Session','Plan','Candidate','Decision','Trade','Review','Psychology'] as const;
  return <div className="guideOverlay" onClick={onClose}><div className="guideCard sourceManagerCard" onClick={e=>e.stopPropagation()}>
    <div className="panelTitle"><div><h2>Field Requirements</h2><p className="subtle">Choose which optional fields must be completed. System and conditional requirements are locked to protect workflow integrity.</p></div><div className="headerActions"><button onClick={onAppearance}>Appearance</button><button onClick={onInstruments}>Instruments</button><button onClick={onSources}>Level sources</button><button onClick={onClose}>Close</button></div></div>
    {msg&&<p className="subtle">{msg}</p>}
    <CustomFieldDiscovery/>
    <details className="guidedMore"><summary>Field visibility and Quick/Detailed placement</summary><p className="subtle">Only connected controls can be changed. Required fields always remain visible. Hidden fields retain saved journal values.</p><label>Find a connected field<input type="search" value={fieldSearch} onChange={e=>setFieldSearch(e.target.value)} placeholder="Search by field name or stage"/></label><div className="requirementGroup"><h3>Plan scenario order</h3><p className="subtle">Change the position of the existing main and alternative scenario prompts.</p>{orderFieldIdsWithinSection(['plan.mainScenario','plan.alternativeScenario'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='plan.mainScenario'?'Main scenario':'Alternative scenario'}</span><div className="requirementControl"><button disabled={index===0} onClick={()=>movePlanScenario(id,-1)}>Up</button><button disabled={index===1} onClick={()=>movePlanScenario(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Zone condition order</h3><p className="subtle">Reorder only the two connected planned-condition prompts.</p>{orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='candidate.requiredConditions'?'Entry conditions':'Abandon conditions'}</span><div className="requirementControl"><button disabled={index===0} onClick={()=>moveZoneCondition(id,-1)}>Up</button><button disabled={index===1} onClick={()=>moveZoneCondition(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Session Review field order</h3><p className="subtle">Move the two connected main reflection fields without editing recorded answers. Order persists across restarts.</p>{orderFieldIdsWithinSection(['sessionReview.wentWell','sessionReview.nextImprovement'],order).map((id,index)=><div className="requirementRow" key={id}><span>{index+1}. {id==='sessionReview.wentWell'?'What went well?':'One thing to improve next session'}</span><div className="requirementControl"><button disabled={index===0} onClick={()=>moveSessionReflection(id,-1)}>Up</button><button disabled={index===1} onClick={()=>moveSessionReflection(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Detailed Session Review field order</h3>{orderFieldIdsWithinSection(['sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning'],order).map((id,index,ids)=><div className="requirementRow" key={id}><span>{index+1}. {FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id}</span><div className="requirementControl"><button disabled={index===0} onClick={()=>moveSessionReflection(id,-1)}>Up</button><button disabled={index===ids.length-1} onClick={()=>moveSessionReflection(id,1)}>Down</button></div></div>)}</div><div className="requirementGroup"><h3>Session Review field labels and help</h3><p className="subtle">Optional wording only. Original field IDs and saved answers do not change.</p>{(['sessionReview.wentWell','sessionReview.nextImprovement','sessionReview.wentPoorly','sessionReview.bestDecision','sessionReview.biggestMistake','sessionReview.marketLearning','plan.mainScenario','plan.alternativeScenario','candidate.label','evidence.note','decision.note'] as const).map(id=><div className="requirementRow" key={id}><label>{FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id} — label<input maxLength={100} value={textDraft[id]?.label??''} placeholder={FIELD_CONTROL_INVENTORY.find(x=>x.id===id)?.label??id} onChange={e=>setTextDraft(d=>({...d,[id]:{...d[id],label:e.target.value}}))}/></label><label>Help text<input maxLength={240} value={textDraft[id]?.help??''} placeholder="Optional short explanation" onChange={e=>setTextDraft(d=>({...d,[id]:{...d[id],help:e.target.value}}))}/></label></div>)}<button onClick={saveTextSettings}>Save labels and help</button></div><p className="subtle">{ACTIVE_VISIBILITY_FIELD_IDS.length} connected field controls. Other inventory controls remain protected or pending integration.</p><div className="requirementGroups">{FIELD_CONTROL_INVENTORY.filter(x=>ACTIVE_VISIBILITY_FIELD_IDS.some(id=>id===x.id)&&isActiveVisibilityControl(x.id)&&(!fieldSearch.trim()||`${x.label} ${x.stage} ${x.id}`.toLowerCase().includes(fieldSearch.trim().toLowerCase()))).map(item=><div className="requirementRow" key={item.id}><div><b>{item.label}</b><span>{item.stage}</span></div><div className="requirementControl"><button disabled={isUserRequired(item.id,draft)} onClick={()=>toggleVisible(item.id)}>{isFieldShown(item.id,visibility,draft)?'Visible':'Hidden'}</button><button disabled={!ACTIVE_VISIBILITY_FIELD_IDS.some(id=>id===item.id)||isUserRequired(item.id,draft)} onClick={()=>togglePlacement(item.id)}>{placements[item.id]==='DETAILED_ONLY'?'Detailed only':'Quick + Detailed'}</button></div></div>)}</div></details>
    <div className="requirementGroups">{groups.map(group=><section className="requirementGroup" key={group}><h3>{group}</h3>
      {FIELD_DEFINITIONS.filter(x=>x.group===group&&x.requirementManaged!==false).map(def=><div className="requirementRow" key={def.id}>
        <div><b>{def.label}</b>{def.conditionalText&&<span>{def.conditionalText}</span>}</div>
        <div className="requirementControl">
          <RequirementBadge id={def.id} overrides={draft}/>
          {def.systemLocked?<button disabled>Locked</button>:<button className={draft[def.id]?'selectedButton':''} onClick={()=>toggle(def.id)}>{draft[def.id]?'Required':'Optional'}</button>}
        </div>
      </div>)}
    </section>)}</div>
    <div className="rowActions"><button onClick={reset}>Reset to defaults</button></div>
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
  return <details key={compact?'compact':'expanded'} open={!compact||selected.length>0?true:undefined}><summary>Why does this location matter? <small>Level sources, not live evidence</small> {selected.length>0&&<small>({selected.length} selected)</small>} <FieldHelp id="candidate.sources"/></summary>{grouped.map(([group,items])=><div className="sourceGroup" key={group}><strong>{group.replaceAll('_',' ')}</strong><div className="chips">{items.map(s=><button type="button" className={selected.includes(s.source_type_id)?'chip selected':'chip'} key={s.source_type_id} onClick={()=>toggle(s.source_type_id)}>{s.label}</button>)}</div></div>)}</details>;
}

function CandidateEditor({candidate,patch,groupedSources,selected,toggleSource,tickStep,requirementOverrides,fieldVisibility,fieldPlacements,fieldText,fieldOrder,quickMode,validationPrefix,validationErrors,clearValidation}:{candidate:CandidateDraftInput;patch:(p:Partial<CandidateDraftInput>)=>void;groupedSources:[string,LevelSourceType[]][];selected:string[];toggleSource:(id:string)=>void;tickStep:number;requirementOverrides:RequirementOverrides;fieldVisibility:Record<string,boolean>;fieldPlacements:Record<string,FieldPlacement>;fieldText:Record<string,{label?:string;help?:string}>;fieldOrder:Record<string,number>;quickMode:boolean;validationPrefix:string;validationErrors:string[];clearValidation:(id:string)=>void}){
  const err=(suffix:string)=>validationErrors.includes(`${validationPrefix}.${suffix}`)?'validationFieldError':'';
  const clear=(suffix:string)=>clearValidation(`${validationPrefix}.${suffix}`);
  return <><p className="subtle">Where are you watching, what must happen before entry, and what cancels the idea?</p><div className="formGrid">{isFieldPresented('candidate.label',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<label>{fieldText['candidate.label']?.label?.trim()||'Name this zone (optional)'}{fieldText['candidate.label']?.help&&<small title={fieldText['candidate.label'].help}>ⓘ</small>}<input value={candidate.label??''} onChange={e=>patch({label:e.target.value})} placeholder="e.g. Upper High"/></label>}<label>What are you watching for here? <small>Directional intent</small> <FieldHelp id="candidate.intent" value={candidate.directional_intent}/><select value={candidate.directional_intent} onChange={e=>patch({directional_intent:e.target.value as CandidateDraftInput['directional_intent']})}>{['LONG','SHORT','CONDITIONAL','WATCH','UNKNOWN'].map(x=><option key={x}>{x}</option>)}</select></label><details className="guidedMore"><summary>More details — trend context</summary><label>How does this idea relate to the trend? <small>Role vs trend</small> <FieldHelp id="candidate.trendRelationship" value={candidate.trend_relationship??'UNCLEAR'}/><select value={candidate.trend_relationship??'UNCLEAR'} onChange={e=>patch({trend_relationship:e.target.value as CandidateDraftInput['trend_relationship']})}>{['WITH_TREND','COUNTERTREND','CONTINUATION_AFTER_CORRECTION','REVERSAL','NA','UNCLEAR'].map(x=><option key={x}>{x}</option>)}</select></label></details><label>At what price? <small>Single price, range or not fixed yet</small> <FieldHelp id="candidate.priceMode" value={candidate.price_mode}/><select value={candidate.price_mode} onChange={e=>{patch({price_mode:e.target.value as CandidateDraftInput['price_mode']});clear('price');clear('priceFrom');clear('priceTo')}}><option value="RANGE">Price range</option><option value="SINGLE">Single price</option><option value="UNSPECIFIED">No fixed price yet</option></select></label>{candidate.price_mode==='RANGE'&&<><label data-validation-id={`${validationPrefix}.priceFrom`} className={err('priceFrom')}>From <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.price_from??''} onChange={e=>{patch({price_from:e.target.value?Number(e.target.value):null});clear('priceFrom')}}/></label><label data-validation-id={`${validationPrefix}.priceTo`} className={err('priceTo')}>To <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.price_to??''} onChange={e=>{patch({price_to:e.target.value?Number(e.target.value):null});clear('priceTo')}}/></label></>}{candidate.price_mode==='SINGLE'&&<label data-validation-id={`${validationPrefix}.price`} className={err('price')}>Price <FieldHelp id="candidate.price"/><input type="number" step={tickStep} value={candidate.reference_price??''} onChange={e=>{patch({reference_price:e.target.value?Number(e.target.value):null});clear('price')}}/></label>}{isFieldPresented('candidate.requiredConditions',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<details style={{order:10+orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],fieldOrder).indexOf('candidate.requiredConditions')}} className="guidedMore" open={isUserRequired('candidate.requiredConditions',requirementOverrides)||validationErrors.includes(`${validationPrefix}.requiredConditions`)||candidate.required_conditions.some(v=>v.trim())?true:undefined} ><summary>{fieldText['candidate.requiredConditions']?.label?.trim()||'Entry conditions'} {isUserRequired('candidate.requiredConditions',requirementOverrides)?'— Required by you':'— Optional'} {fieldText['candidate.requiredConditions']?.help&&<small title={fieldText['candidate.requiredConditions'].help}>ⓘ</small>}</summary><label data-validation-id={`${validationPrefix}.requiredConditions`} className={err('requiredConditions')}>What must you see before entry? <small>Planned conditions, not observed evidence</small> <RequirementBadge id="candidate.requiredConditions" overrides={requirementOverrides}/> <FieldHelp id="candidate.requiredConditions"/><textarea value={candidate.required_conditions.join('\n')} onChange={e=>{patch({required_conditions:e.currentTarget.value.split(/\r?\n/)});clear('requiredConditions')}} placeholder={isUserRequired('candidate.requiredConditions',requirementOverrides)?'Required by you — one condition per line':'One condition per line'}/></label></details>}{isFieldPresented('candidate.invalidationConditions',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<details style={{order:10+orderFieldIdsWithinSection(['candidate.requiredConditions','candidate.invalidationConditions'],fieldOrder).indexOf('candidate.invalidationConditions')}} className="guidedMore" open={isUserRequired('candidate.invalidationConditions',requirementOverrides)||validationErrors.includes(`${validationPrefix}.invalidationConditions`)||candidate.invalidation_conditions.some(v=>v.trim())?true:undefined} ><summary>{fieldText['candidate.invalidationConditions']?.label?.trim()||'Abandon conditions'} {isUserRequired('candidate.invalidationConditions',requirementOverrides)?'— Required by you':'— Optional'} {fieldText['candidate.invalidationConditions']?.help&&<small title={fieldText['candidate.invalidationConditions'].help}>ⓘ</small>}</summary><label data-validation-id={`${validationPrefix}.invalidationConditions`} className={err('invalidationConditions')}>When would you abandon this idea? <small>Thesis invalidation, not the stop order</small> <RequirementBadge id="candidate.invalidationConditions" overrides={requirementOverrides}/> <FieldHelp id="candidate.invalidationConditions"/><textarea value={candidate.invalidation_conditions.join('\n')} onChange={e=>{patch({invalidation_conditions:e.currentTarget.value.split(/\r?\n/)});clear('invalidationConditions')}} placeholder={isUserRequired('candidate.invalidationConditions',requirementOverrides)?'Required by you — one condition per line':'One condition per line'}/></label></details>}</div>{isFieldPresented('candidate.sources',quickMode,fieldVisibility,fieldPlacements,requirementOverrides)&&<div data-validation-id={`${validationPrefix}.sources`} className={err('sources')}><p className="subtle">{fieldText['candidate.sources']?.label?.trim()||'Level sources'}{isUserRequired('candidate.sources',requirementOverrides)?' — Required by you':''}{fieldText['candidate.sources']?.help&&<small title={fieldText['candidate.sources'].help}> ⓘ</small>}</p><SourcePicker grouped={groupedSources} selected={selected} toggle={id=>{toggleSource(id);clear('sources')}} compact={!isUserRequired('candidate.sources',requirementOverrides)&&!validationErrors.includes(`${validationPrefix}.sources`)}/></div>}</>;
}


function AttachmentPanel({ownerType,ownerId,defaultStage,title,compact=false}:{ownerType:'SESSION'|'CANDIDATE'|'DECISION'|'TRADE'|'REVIEW';ownerId:string;defaultStage:typeof ATTACHMENT_STAGES[number];title:string;compact?:boolean}){
  const [items,setItems]=useState<Attachment[]>([]);
  const [stage,setStage]=useState<typeof ATTACHMENT_STAGES[number]>(defaultStage);
  const [caption,setCaption]=useState('');
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
    <div className="attachmentControls"><label>Stage<select value={stage} onChange={e=>setStage(e.target.value as typeof ATTACHMENT_STAGES[number])}>{ATTACHMENT_STAGES.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Caption <small>Optional</small><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Only if useful"/></label></div>
    {msg&&<p className="subtle">{msg}</p>}
    {items.length>0&&<div className="attachmentGrid">{items.map(a=><div className="attachmentCard" key={a.attachment_id}>
      {preview[a.attachment_id]?<button className="thumbButton" onClick={()=>show(a)}><img src={preview[a.attachment_id]} alt={a.caption||a.original_filename||'Trading screenshot'}/></button>:<button className="previewButton" onClick={()=>show(a)}>Preview</button>}
      <small>{a.stage.replaceAll('_',' ')} · {a.original_filename||'image'}</small>{a.caption&&<span>{a.caption}</span>}
      {editingId===a.attachment_id?<div className="attachmentEdit"><label>Stage<select value={editStage} onChange={e=>setEditStage(e.target.value as typeof ATTACHMENT_STAGES[number])}>{ATTACHMENT_STAGES.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Caption<input value={editCaption} onChange={e=>setEditCaption(e.target.value)}/></label><div className="attachmentActions"><button onClick={()=>setEditingId(null)}>Cancel</button><button className="primary" disabled={busy} onClick={()=>saveEdit(a)}>Save</button></div></div>:<div className="attachmentActions"><button onClick={()=>show(a)}>Open</button><button onClick={()=>beginEdit(a)}>Edit</button><button disabled={busy} onClick={()=>replaceFile(a)}>Replace</button><button className="dangerButton" disabled={busy} onClick={()=>remove(a)}>Delete</button></div>}
    </div>)}</div>}
    {lightboxItem&&preview[lightboxItem.attachment_id]&&<div className="imageLightbox" onClick={()=>setLightboxId(null)}><div className="imageLightboxCard" onClick={e=>e.stopPropagation()}><div className="imageLightboxHead"><div><b>{lightboxItem.stage.replaceAll('_',' ')}</b><span>{lightboxItem.caption||lightboxItem.original_filename||'Screenshot'}</span></div><button onClick={()=>setLightboxId(null)}>Close</button></div><img src={preview[lightboxItem.attachment_id]} alt={lightboxItem.caption||lightboxItem.original_filename||'Trading screenshot'}/>{items.length>1&&<div className="lightboxNav"><button onClick={()=>stepLightbox(-1)}>← Previous</button><button onClick={()=>stepLightbox(1)}>Next →</button></div>}</div></div>}
  </div>
}


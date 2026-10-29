/**
 * Field Manager phase — declarative control inventory, NOT a settings implementation.
 * Grounded in app/src/App.tsx visible inputs as audited 2026-10-10.
 * This module deliberately does not alter the persisted Field Requirements registry.
 * Nothing here may change immutable records or field validation semantics.
 */
import { FIELD_DEFINITION_BY_ID, isUserRequired, type RequirementOverrides } from './fieldDefinitions';

export type InventoryCategory =
  | 'journal-field'
  | 'conditional-journal-field'
  | 'registry-setting'
  | 'analytics-filter'
  | 'attachment-metadata'
  | 'appearance-preference';

export type InventoryStage =
  | 'session-setup' | 'premarket-plan' | 'zone'
  | 'plan-revision' | 'live-evidence' | 'decision'
  | 'execution' | 'post-trade-review' | 'session-review'
  | 'analytics' | 'settings' | 'attachment';

export type InventoryEntry = Readonly<{
  id: string;
  label: string;
  stage: InventoryStage;
  category: InventoryCategory;
  /** Whether a trader may eventually customize this control; permission to change requirement is separate. */
  candidateForCustomization: boolean;
  /** Input controls essential to calculation/identity or immutable history must remain protected. */
  protectedReason?: string;
  /** Existing canonical field definitions remain source of truth for requirement semantics. */
  formalFieldId?: string;
}>;

const entry = (id:string,label:string,stage:InventoryStage,category:InventoryCategory,candidateForCustomization:boolean,formalFieldId?:string,protectedReason?:string):InventoryEntry =>
  ({id,label,stage,category,candidateForCustomization,formalFieldId,protectedReason});

export const FIELD_CONTROL_INVENTORY: readonly InventoryEntry[] = [
  entry('session.date','Session date','session-setup','journal-field',false,'session.date','Session identity'),
  entry('session.instrument','Instrument','session-setup','journal-field',false,'session.instrument','Instrument snapshot and calculations'),
  entry('session.environment','Environment','session-setup','journal-field',false,'session.environment','Real/demo data segregation'),
  entry('plan.bias','Initial bias','premarket-plan','journal-field',false,'plan.bias','Canonical initial-plan record'),
  entry('plan.mainScenario','Main scenario','premarket-plan','journal-field',true,'plan.mainScenario'),
  entry('plan.alternativeScenario','Alternative scenario','premarket-plan','journal-field',true,'plan.alternativeScenario'),
  entry('plan.preSessionState','Pre-session state','premarket-plan','journal-field',true,'plan.preSessionState'),
  entry('plan.preSessionStateIntensity','Pre-session intensity','premarket-plan','journal-field',true),
  entry('candidate.status','Zone lifecycle status','zone','conditional-journal-field',false,undefined,'Timestamped candidate status events; protected lifecycle codes'),
  entry('candidate.label','Zone name','zone','journal-field',true),
  entry('candidate.intent','Directional intent','zone','journal-field',false,'candidate.intent','Candidate intent integrity'),
  entry('candidate.trendRelationship','Trend relationship','zone','journal-field',true,'candidate.trendRelationship'),
  entry('candidate.priceMode','Price mode','zone','conditional-journal-field',false,'candidate.priceMode','Controls price geometry requirements'),
  entry('candidate.price','Zone price or range','zone','conditional-journal-field',false,'candidate.price','Required when single or range price is selected'),
  entry('candidate.sources','Level sources','zone','journal-field',true,'candidate.sources'),
  entry('candidate.requiredConditions','Planned entry conditions','zone','journal-field',true,'candidate.requiredConditions'),
  entry('candidate.invalidationConditions','Thesis abandonment conditions','zone','journal-field',true,'candidate.invalidationConditions'),
  entry('planRevision.bias','Revised bias','plan-revision','journal-field',false,undefined,'Immutable timestamped plan revision'),
  entry('planRevision.reason','Reason for revision','plan-revision','journal-field',false,undefined,'Plan revision audit integrity'),
  entry('planRevision.evidence','Revision evidence summary','plan-revision','journal-field',true),
  entry('candidateRevision.reason','Zone revision reason','plan-revision','journal-field',false,undefined,'Zone history audit'),
  entry('evidence.type','Observed evidence type','live-evidence','journal-field',false,undefined,'Evidence provenance'),
  entry('evidence.role','Evidence role','live-evidence','journal-field',false,undefined,'Evidence classification semantics'),
  entry('evidence.direction','Evidence direction','live-evidence','journal-field',true),
  entry('evidence.price','Evidence price','live-evidence','journal-field',true),
  entry('evidence.note','Evidence note','live-evidence','journal-field',true),
  entry('decision.direction','Intended trade direction','decision','conditional-journal-field',false,undefined,'Protected trade direction semantics'),
  entry('decision.type','Decision type','decision','journal-field',false,'decision.type','Decision/No-trade/Missed distinction'),
  entry('decision.reason','Decision reason','decision','conditional-journal-field',false,'decision.reason','Required for No-trade/Missed'),
  entry('decision.quality','Decision quality','decision','journal-field',true,'decision.quality'),
  entry('decision.note','Decision note','decision','journal-field',true),
  entry('decision.mismatchReason','Opposite-plan explanation','decision','conditional-journal-field',false,undefined,'Required only when relevant'),
  entry('trade.entryPrice','Executed entry','execution','journal-field',false,'trade.entryPrice','Execution fill integrity'),
  entry('trade.stopPrice','Initial protective stop','execution','journal-field',false,'trade.stopPrice','Initial risk baseline'),
  entry('trade.quantity','Entry quantity','execution','journal-field',false,'trade.quantity','Contracts/shares and P&L'),
  entry('trade.plannedTarget','Planned target','execution','journal-field',true,'trade.plannedTarget'),
  entry('fill.action','Fill action','execution','journal-field',false,undefined,'Immutable execution event type'),
  entry('fill.price','Fill price','execution','journal-field',false,undefined,'Real execution price'),
  entry('fill.quantity','Fill quantity','execution','journal-field',false,undefined,'Position accounting'),
  entry('fill.reason','Fill reason','execution','journal-field',true),
  entry('management.newStop','Revised stop','execution','conditional-journal-field',false,undefined,'Stop event integrity'),
  entry('management.reason','Management reason','execution','journal-field',true),
  entry('review.decisionQuality','Reviewed decision quality','post-trade-review','journal-field',true,'review.decisionQuality'),
  entry('review.executionQuality','Execution quality','post-trade-review','journal-field',true,'review.executionQuality'),
  entry('review.managementQuality','Management quality','post-trade-review','journal-field',true,'review.managementQuality'),
  entry('psychology.emotionAffected','Emotion affected this trade','post-trade-review','conditional-journal-field',false,'psychology.emotionAffected','Conditional psychological record'),
  entry('psychology.state','Emotional state','post-trade-review','conditional-journal-field',true,'psychology.state'),
  entry('psychology.stage','Affected stage','post-trade-review','conditional-journal-field',true,'psychology.stage'),
  entry('psychology.intensity','Emotion intensity','post-trade-review','journal-field',true),
  entry('review.exitReason','Exit reason','post-trade-review','journal-field',true),
  entry('review.exitNote','Exit reason detail','post-trade-review','journal-field',true),
  entry('review.mistakes','Recorded mistakes','post-trade-review','journal-field',true),
  entry('rule.violationReported','Rule violation reported','post-trade-review','conditional-journal-field',false,undefined,'Affects rule adherence classification'),
  entry('rule.violatedIds','Violated rules','post-trade-review','conditional-journal-field',false,undefined,'Mandatory when rule violation is reported'),
  entry('rule.note','Rule violation note','post-trade-review','journal-field',true),
  entry('review.note','Review note','post-trade-review','journal-field',true),
  entry('sessionReview.overall','Overall session assessment','session-review','journal-field',true),
  entry('sessionReview.wentWell','What went well','session-review','journal-field',true),
  entry('sessionReview.wentPoorly','What went poorly','session-review','journal-field',true),
  entry('sessionReview.bestDecision','Best decision','session-review','journal-field',true),
  entry('sessionReview.biggestMistake','Biggest mistake','session-review','journal-field',true),
  entry('sessionReview.marketLearning','Market learning','session-review','journal-field',true),
  entry('sessionReview.nextImprovement','Next improvement','session-review','journal-field',true),
  entry('sessionReview.planQuality','Plan quality','session-review','journal-field',true),
  entry('sessionReview.discipline','Discipline','session-review','journal-field',true),
  entry('attachment.stage','Attachment stage','attachment','attachment-metadata',false,undefined,'Evidence linkage'),
  entry('attachment.caption','Attachment caption','attachment','attachment-metadata',true),
  entry('analytics.from','From date','analytics','analytics-filter',false),
  entry('analytics.to','To date','analytics','analytics-filter',false),
  entry('analytics.instrument','Instrument filter','analytics','analytics-filter',false),
  entry('analytics.direction','Direction filter','analytics','analytics-filter',false),
  entry('analytics.decisionQuality','Decision quality filter','analytics','analytics-filter',false),
  entry('analytics.ruleStatus','Rule status filter','analytics','analytics-filter',false),
  entry('analytics.source','Level-source filter','analytics','analytics-filter',false),
  entry('analytics.evidence','Evidence filter','analytics','analytics-filter',false),
  entry('instrument.displayName','Instrument display name','settings','registry-setting',false,undefined,'Display label; preserve instrument identity and historical snapshots'),
  entry('instrument.symbol','Instrument symbol','settings','registry-setting',false,undefined,'Snapshot identity'),
  entry('instrument.tickSize','Tick size','settings','registry-setting',false,undefined,'Price and risk calculations'),
  entry('instrument.pointValue','Point value','settings','registry-setting',false,undefined,'P&L calculations'),
  entry('instrument.currency','Currency','settings','registry-setting',false,undefined,'P&L currency semantics'),
  entry('instrument.marketType','Market type','settings','registry-setting',false,undefined,'Contract semantics'),
  entry('source.name','Level source name','settings','registry-setting',false,undefined,'Historical source identity'),
  entry('source.category','Level source category','settings','registry-setting',false,undefined,'Source registry semantics'),
  entry('source.description','Level source description','settings','registry-setting',false),
  entry('appearance.theme','Theme','settings','appearance-preference',false),
  entry('appearance.fontSize','Font size','settings','appearance-preference',false),
  entry('appearance.fontFamily','Font family','settings','appearance-preference',false),
  entry('appearance.backgroundTone','Background tone','settings','appearance-preference',false),
] as const;

/** True when inventory references a canonical formal field identifier that does not exist. */
export function unknownFormalFieldIds():string[] {
  return FIELD_CONTROL_INVENTORY.filter(x=>x.formalFieldId && !(x.formalFieldId in FIELD_DEFINITION_BY_ID)).map(x=>x.formalFieldId!);
}

/** Duplicate IDs cannot safely support user preferences, snapshots or settings migrations. */
export function duplicateInventoryIds():string[] {
  const used=new Set<string>();
  const duplicates:string[]=[];
  for(const item of FIELD_CONTROL_INVENTORY){
    if(used.has(item.id))duplicates.push(item.id);
    else used.add(item.id);
  }
  return duplicates;
}

/**
 * Pure preview of prospective visibility settings. Nothing is persisted or hidden
 * until a separately approved settings/storage implementation uses this resolver.
 * Caller supplies conditionalRequired from actual workflow state, not a guess.
 */
export function resolveFieldVisibility(
  id:string,
  requestedVisible:boolean,
  requirementOverrides:RequirementOverrides,
  conditionalRequired=false,
):boolean {
  const item=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
  // Unknown inputs fail open: a missing inventory entry must never lose a form control.
  if(!item)return true;
  if(!item.candidateForCustomization)return true;
  const def=item.formalFieldId?FIELD_DEFINITION_BY_ID[item.formalFieldId]:undefined;
  if(def?.systemLocked || def?.defaultRequirement==='SYSTEM_REQUIRED')return true;
  if(requirementOverrides[id]===true || isUserRequired(item.formalFieldId??id,requirementOverrides))return true;
  if(conditionalRequired)return true;
  return requestedVisible;
}

/** Stable, non-mutating ordering policy for a single form section.
 * Unknown/invalid ranks fall back to the original form order. The policy deliberately
 * does not persist preferences or reparent conditional inputs across workflow stages.
 */
export function orderFieldIdsWithinSection(
  ids:readonly string[],
  ranks:Readonly<Record<string,number>>,
):string[] {
  return ids.map((id,index)=>({id,index,rank:ranks[id]}))
    .sort((a,b)=>{
      const ar=Number.isSafeInteger(a.rank)&&a.rank>=0?a.rank:Number.MAX_SAFE_INTEGER;
      const br=Number.isSafeInteger(b.rank)&&b.rank>=0?b.rank:Number.MAX_SAFE_INTEGER;
      return ar-br || a.index-b.index;
    }).map(x=>x.id);
}

/** Controls with an actual form binding; inventory-only fields cannot be toggled yet. */
export const ACTIVE_VISIBILITY_FIELD_IDS = [
  'plan.mainScenario',
  'plan.alternativeScenario',
  'plan.preSessionStateIntensity',
  'plan.preSessionState',
  'candidate.label',
  'candidate.sources',
  'candidate.requiredConditions',
  'candidate.invalidationConditions',
  'evidence.price',
  'evidence.note',
  'decision.note',
  'review.note',
  'review.decisionQuality',
  'review.executionQuality',
  'review.managementQuality',
  'review.exitReason',
  'review.exitNote',
  'rule.note',
  'sessionReview.wentPoorly',
  'sessionReview.bestDecision',
  'sessionReview.biggestMistake',
  'sessionReview.marketLearning',
  'sessionReview.wentWell',
  'sessionReview.nextImprovement',
] as const;

/** Report stale or duplicated active setting IDs before enabling them in Settings. */
export function activeVisibilityInventoryIssues():string[] {
  const seen=new Set<string>();
  const issues:string[]=[];
  for(const id of ACTIVE_VISIBILITY_FIELD_IDS){
    if(seen.has(id))issues.push(`duplicate:${id}`);
    seen.add(id);
    const item=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
    if(!item)issues.push(`missing:${id}`);
    else if(!item.candidateForCustomization || item.protectedReason)issues.push(`protected:${id}`);
  }
  return issues;
}

export function isActiveVisibilityControl(id:string):boolean {
  const item=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
  const def=item?.formalFieldId?FIELD_DEFINITION_BY_ID[item.formalFieldId]:undefined;
  return ACTIVE_VISIBILITY_FIELD_IDS.some(allowed=>allowed===id)
    && item?.candidateForCustomization===true
    && def?.systemLocked!==true;
}

/** Reusable policy for all plan/zone forms: no entry in preferences means visible. */
export function isFieldShown(
  id:string,
  preferences:Readonly<Record<string,boolean>>,
  overrides:RequirementOverrides,
  conditionalRequired=false,
):boolean {
  if(!isActiveVisibilityControl(id))return true;
  return resolveFieldVisibility(id,preferences[id]!==false,overrides,conditionalRequired);
}

/**
 * Quick/Detailed placement policy, shared by all stage forms.
 * Defaults retain current Quick visibility; no historical data is changed.
 * A required or conditionally required field cannot be moved out of Quick.
 */
export type FieldPlacement = 'QUICK_AND_DETAILED' | 'DETAILED_ONLY';
export function isFieldInMode(
  id:string,
  quickMode:boolean,
  placements:Readonly<Record<string,FieldPlacement>>,
  requirementOverrides:RequirementOverrides,
  conditionalRequired=false,
):boolean {
  if(!quickMode)return true;
  if(!isActiveVisibilityControl(id))return true;
  if(requirementOverrides[id]===true||isUserRequired(id,requirementOverrides)||conditionalRequired)return true;
  const item=FIELD_CONTROL_INVENTORY.find(x=>x.id===id);
  const def=item?.formalFieldId?FIELD_DEFINITION_BY_ID[item.formalFieldId]:undefined;
  if(item?.protectedReason||def?.systemLocked||def?.defaultRequirement==='SYSTEM_REQUIRED')return true;
  return placements[id]!=='DETAILED_ONLY';
}

export function isFieldPresented(
  id:string,
  quickMode:boolean,
  visibility:Readonly<Record<string,boolean>>,
  placements:Readonly<Record<string,FieldPlacement>>,
  requirementOverrides:RequirementOverrides,
  conditionalRequired=false,
):boolean {
  return isFieldShown(id,visibility,requirementOverrides,conditionalRequired)
    && isFieldInMode(id,quickMode,placements,requirementOverrides,conditionalRequired);
}

import type {JournalTradeRow, MistakeSummary} from './services/localApi';

/** Independent decision-only reads may succeed while executed-Trade analytics
 * fail. A loaded MISSED row is not evidence that zero Trades existed.
 * Fail closed on trade-dependent weekly metrics and action commitments. */
export function weeklyTradeReadiness(
  loading:boolean,tradeError:string,weekCount:number,
):'LOADING'|'TRADE_UNAVAILABLE'|'EMPTY'|'READY'{
  if(loading)return 'LOADING';
  if(tradeError.trim())return 'TRADE_UNAVAILABLE';
  return weekCount>0?'READY':'EMPTY';
}

/** ISO-8601 Monday based on the journal's recorded session DATE, never the OS timezone. */
export function journalWeekStart(sessionDate:string):string|null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))return null;
  const day=new Date(sessionDate+'T00:00:00Z');
  if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==sessionDate)return null;
  day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));
  return day.toISOString().slice(0,10);
}

export type WeeklyTradeBreakdown=Readonly<{
  label:string;
  tradeCount:number;
  closedCount:number;
  eligibleRCount:number;
  netR:number|null;
  ruleViolationCount:number;
}>;

/** All groups are descriptive. Keep R unknown when none of the closed
 * trades has a trusted denominator and complete known costs. */
export function weeklyTradeBreakdown(
  rows:readonly JournalTradeRow[],
  weekStart:string,
  groupBy:'instrument_symbol'|'decision_quality'|'direction',
):WeeklyTradeBreakdown[]{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of weekly){
    const raw=groupBy==='instrument_symbol'?row.instrument_symbol:groupBy==='direction'?row.direction:row.decision_quality;
    const label=raw?.trim()||'Not recorded';
    const group=groups.get(label)||[];
    group.push(row);
    groups.set(label,group);
  }
  return [...groups].map(([label,items])=>{
    const closed=items.filter(item=>item.status==='CLOSED');
    const eligible=closed.filter(item=>item.realized_r!=null&&Number.isFinite(item.realized_r));
    return {
      label,tradeCount:items.length,closedCount:closed.length,eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,item)=>sum+(item.realized_r as number),0):null,
      ruleViolationCount:items.filter(item=>item.rule_status==='VIOLATED').length,
    };
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** Ordinals come from the complete native Session history, not filtered rows. */
export function weeklyTradeNumberBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<number|null,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const value=row.session_trade_number;
    const n=typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:null;
    const group=groups.get(n)||[];group.push(row);groups.set(n,group);
  }
  return [...groups.entries()].sort(([a],[b])=>a===null?(b===null?0:1):b===null?-1:a-b).map(([n,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {label:n===null?'Unknown trade number':'Trade #'+n,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  });
}

/** Session-date weekday, never inferred from a trade's exit or current clock.
 * Same-week multiple sessions remain independent in the Session breakdown. */
export function weeklyWeekdayBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const grouped=new Map<number,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const day=new Date(row.session_date+'T00:00:00Z').getUTCDay();
    const group=grouped.get(day)||[];
    group.push(row);grouped.set(day,group);
  }
  return [...grouped.entries()].sort(([a],[b])=>((a+6)%7)-((b+6)%7))
    .map(([day,items])=>{
      const closed=items.filter(item=>item.status==='CLOSED');
      const eligible=closed.filter(item=>item.realized_r!=null&&Number.isFinite(item.realized_r));
      return {
        label:names[day],tradeCount:items.length,closedCount:closed.length,
        eligibleRCount:eligible.length,
        netR:eligible.length?eligible.reduce((sum,item)=>sum+(item.realized_r as number),0):null,
        ruleViolationCount:items.filter(item=>item.rule_status==='VIOLATED').length,
      };
    });
}

/** Recorded Decision-time hour in its originating Session's saved IANA
 * timezone. Never use device timezone, guessed exchange open, planned time
 * or an unzoned legacy timestamp. A missing event/zone remains UNKNOWN. */
export function localDecisionHour(
  recorded:string|null|undefined,zone:string|null|undefined,
):string|null{
  if(!recorded||!zone||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(recorded))return null;
  const at=new Date(recorded);
  const civilDate=recorded.slice(0,10);
  const checkedDay=new Date(civilDate+'T00:00:00Z');
  if(!Number.isFinite(at.getTime())||!Number.isFinite(checkedDay.getTime())||
     checkedDay.toISOString().slice(0,10)!==civilDate)return null;
  try{
    const formatter=new Intl.DateTimeFormat('en-GB',{
      timeZone:zone,hour:'2-digit',hourCycle:'h23',
    });
    const text=formatter.formatToParts(at).find(part=>part.type==='hour')?.value;
    const hour=Number(text);
    if(!text||!Number.isInteger(hour)||hour<0||hour>23)return null;
    return String(hour).padStart(2,'0');
  }catch{return null;}
}

/** Decision-time distribution; NOT fill/entry time and NOT a session phase.
 * Different saved timezones remain separate. Unknown clocks are listed as
 * unknown counts, not assigned to a manufactured 00:00 hour or a net R. */
export function weeklyDecisionHourBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const trade of rows){
    if(journalWeekStart(trade.session_date)!==weekStart)continue;
    const hour=localDecisionHour(trade.decision_occurred_at,trade.session_timezone_id);
    const label=hour&&trade.session_timezone_id
      ?trade.session_timezone_id+' · '+hour+':00–'+hour+':59'
      :'Unknown recorded Decision time / Session zone';
    const existing=groups.get(label)||[];
    existing.push(trade);groups.set(label,existing);
  }
  return [...groups.entries()].sort(([left],[right])=>{
    const unknown='Unknown recorded Decision time / Session zone';
    if(left===unknown)return right===unknown?0:1;
    if(right===unknown)return -1;
    return left.localeCompare(right);
  }).map(([label,items])=>{
    const closed=items.filter(item=>item.status==='CLOSED');
    const unknown=label.startsWith('Unknown recorded');
    const eligible=unknown?[]:closed.filter(item=>item.realized_r!=null&&Number.isFinite(item.realized_r));
    return {
      label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,item)=>sum+(item.realized_r as number),0):null,
      ruleViolationCount:items.filter(item=>item.rule_status==='VIOLATED').length,
    };
  });
}

/** Session identity is retained independently of the calendar date: multiple
 * sessions on one day must never be merged into a single sample. */
export function weeklySessionBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const grouped=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const group=grouped.get(row.session_id)||[];
    group.push(row);grouped.set(row.session_id,group);
  }
  return [...grouped.entries()].map(([sessionId,items])=>{
    const closed=items.filter(item=>item.status==='CLOSED');
    const eligible=closed.filter(item=>item.realized_r!=null&&Number.isFinite(item.realized_r));
    const date=items[0].session_date;
    return {
      label:date+' · Session ID '+sessionId,
      tradeCount:items.length,closedCount:closed.length,eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((total,item)=>total+(item.realized_r as number),0):null,
      ruleViolationCount:items.filter(item=>item.rule_status==='VIOLATED').length,
    };
  }).sort((a,b)=>b.label.localeCompare(a.label));
}

/** A trade may have multiple saved decision-time level sources. Group counts
 * overlap by design and MUST NOT be added together as distinct trades.
 * Missing historical provenance snapshots cannot be interpreted as "none".
 */
function weeklyLevelSourceBreakdownWithMembership(
  rows:readonly JournalTradeRow[],weekStart:string,
): (WeeklyTradeBreakdown & {identityKey:string;eligibleTradeIds:readonly string[]})[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const labels=row.level_source_snapshot_missing
      ? ['Decision-time provenance unknown']
      : row.level_sources.length>0
        ? [...new Set(row.level_sources.map(label=>label.trim()).filter(Boolean))]
        : ['No source recorded at decision'];
    for(const label of labels.length?labels:['No source recorded at decision']){
      const group=groups.get(label)||[];
      group.push(row);groups.set(label,group);
    }
  }
  return [...groups].map(([label,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {identityKey:label,eligibleTradeIds:eligible.map(row=>row.trade_id),label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length,
    };
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

export function weeklyLevelSourceBreakdown(rows:readonly JournalTradeRow[],weekStart:string):WeeklyTradeBreakdown[]{
  return weeklyLevelSourceBreakdownWithMembership(rows,weekStart).map(({identityKey,eligibleTradeIds,...group})=>group);
}

/** Count only observed records whose event time is at or before the
 * original persisted Decision. Missing/invalid/post-Decision events are not
 * automatically treated as confirmations. Groups can overlap on one Trade.
 */
function weeklyObservedEvidenceBreakdownWithMembership(
  rows:readonly JournalTradeRow[],weekStart:string,
): (WeeklyTradeBreakdown & {identityKey:string;eligibleTradeIds:readonly string[]})[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const observed=[...new Set((row.evidence_observed_at_decision??[])
      .map(x=>x.trim()).filter(Boolean))];
    // Distinguish absent verified pre-decision evidence from observed events
    // whose recorded time is later or unknown. These are coverage categories,
    // NOT evidence that any event confirmed the Decision. A trade can appear
    // in several categories; never add group counts as distinct trades.
    const labels=observed.length?[...observed]:[];
    if(!observed.length){
      labels.push('No timestamp-verified evidence at Decision');
    }
    if((row.evidence_post_decision_count??0)>0){
      labels.push('Evidence recorded after Decision (not entry confirmation)');
    }
    if((row.evidence_unknown_timing_count??0)>0){
      labels.push('Evidence with unknown timing (not verified at Decision)');
    }
    for(const label of labels){
      const group=groups.get(label)||[];group.push(row);groups.set(label,group);
    }
  }
  return [...groups].map(([label,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {identityKey:label,eligibleTradeIds:eligible.map(row=>row.trade_id),label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((total,row)=>total+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

export function weeklyObservedEvidenceBreakdown(rows:readonly JournalTradeRow[],weekStart:string):WeeklyTradeBreakdown[]{
  return weeklyObservedEvidenceBreakdownWithMembership(rows,weekStart).map(({identityKey,eligibleTradeIds,...group})=>group);
}

/** A saved Setup definition is not proof that its market context actually
 * occurred. At-entry and retrospectively linked trades remain distinct.
 * Group identity uses immutable version ID, not potentially reused labels.
 */
function weeklySetupVersionBreakdownWithMembership(
  rows:readonly JournalTradeRow[], weekStart:string,
): (WeeklyTradeBreakdown & {identityKey:string;eligibleTradeIds:readonly string[]})[]{
  const groups=new Map<string,{label:string;items:JournalTradeRow[]}>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const origin=row.setup_version_id
      ? row.setup_attribution==='RETROSPECTIVE'?'Retrospective':'At entry'
      : 'Not recorded';
    const name=row.setup_version_name?.trim()||'Unnamed / legacy setup';
    const label=row.setup_version_id
      ? name+' · '+(row.setup_version_number==null?'version unknown':'v'+row.setup_version_number)+' · '+origin+' · ID '+row.setup_version_id.slice(-8)
      : 'No recorded Setup version';
    const key=row.setup_version_id?origin+':'+row.setup_version_id:'NONE';
    const group=groups.get(key)||{label,items:[]};
    group.items.push(row);groups.set(key,group);
  }
  return [...groups.entries()].map(([key,{label,items}])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {identityKey:key,eligibleTradeIds:eligible.map(row=>row.trade_id),label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

export function weeklySetupVersionBreakdown(rows:readonly JournalTradeRow[],weekStart:string):WeeklyTradeBreakdown[]{
  return weeklySetupVersionBreakdownWithMembership(rows,weekStart).map(({identityKey,eligibleTradeIds,...group})=>group);
}

/** Version definition text, not observed session market conditions.
 * Retrospective links are kept separate from known-at-entry versions.
 */
export function weeklyDefinedContextBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const context=row.setup_defined_market_context?.trim()||'Setup context not recorded';
    const scope=row.setup_attribution==='RETROSPECTIVE'?' (retrospective)':row.setup_version_id?' (at entry)':' (no linked version)';
    const key=context+scope;
    const group=groups.get(key)||[];group.push(row);groups.set(key,group);
  }
  return [...groups.entries()].map(([label,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** Association, not causal mistake cost: count distinct tagged Trades and
 * show known negative R separately from the net of all eligible tagged Trades.
 * Multiple mistake labels can overlap on one Trade; never sum the groups. */
/** Legacy rows without stable IDs retain separate label-only groups. */
function recordedMistakeGroups(row:JournalTradeRow):{key:string;label:string;id:string|null}[]{
  if(row.mistake_refs!==undefined){
    const unique=new Map<string,{key:string;label:string;id:string|null}>();
    for(const ref of row.mistake_refs){
      if(ref.mistake_type_id.trim())unique.set(ref.mistake_type_id,{key:'id:'+ref.mistake_type_id,label:ref.label,id:ref.mistake_type_id});
    }
    return [...unique.values()];
  }
  return [...new Set(row.mistakes??[])].filter(label=>label.trim()).map(label=>({key:'legacy:'+label,label,id:null}));
}
export type WeeklyMistakeOutcome=Readonly<{
  identityKey?:string;
  label:string;tradeCount:number;weekTradeCount:number;closedCount:number;
  eligibleRCount:number;lossCount:number;lossR:number|null;netR:number|null;
  tradeIds:readonly string[];
}>;
export function weeklyMistakeOutcomes(rows:readonly JournalTradeRow[],weekStart:string):WeeklyMistakeOutcome[]{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const groups=new Map<string,{label:string;id:string|null;items:JournalTradeRow[]}>();
  for(const row of weekly){
    for(const ref of recordedMistakeGroups(row)){
      const group=groups.get(ref.key)||{label:ref.label,id:ref.id,items:[]};
      group.items.push(row);groups.set(ref.key,group);
    }
  }
  return [...groups].map(([key,{label,id,items}])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    const losses=eligible.filter(row=>(row.realized_r as number)<-1e-9);
    return {...(id===null?{}:{identityKey:key}),label,tradeCount:items.length,weekTradeCount:weekly.length,closedCount:closed.length,
      eligibleRCount:eligible.length,lossCount:losses.length,
      lossR:eligible.length?losses.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      tradeIds:items.map(row=>row.trade_id)};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** Shared chart contract: contributing IDs are distinct from the full tagged
 * population. A zero known loss is different from an unavailable loss. */
export type WeeklyInteractiveMetric=Readonly<{
  key:string;label:string;value:number|null;sample:string;tradeIds:readonly string[];
}>;
export function weeklyMistakeChartMetrics(rows:readonly JournalTradeRow[],weekStart:string,mode:'frequency'|'loss'):WeeklyInteractiveMetric[]{
  const groups=weeklyMistakeOutcomes(rows,weekStart);
  const byId=new Map(rows.map(row=>[row.trade_id,row]));
  return groups.map(g=>{
    const label=groups.filter(other=>other.label===g.label).length>1
      ?g.label+' · '+(g.identityKey??'legacy label'):g.label;
    return {key:g.identityKey??'legacy:'+g.label,label,
      value:mode==='frequency'?g.tradeCount:g.lossR===null?null:Math.abs(g.lossR),
      sample:mode==='frequency'?g.tradeCount+'/'+g.weekTradeCount+' tagged Trades':
        g.lossCount+' known losing Trades · '+g.eligibleRCount+'/'+g.closedCount+' closed R eligible',
      tradeIds:mode==='frequency'?g.tradeIds:g.tradeIds.filter(id=>{
        const row=byId.get(id);return row?.status==='CLOSED'&&typeof row.realized_r==='number'&&Number.isFinite(row.realized_r)&&row.realized_r< -1e-9;
      })};
  }).sort((a,b)=>a.value===null?(b.value===null?a.label.localeCompare(b.label):1):b.value===null?-1:b.value-a.value||a.label.localeCompare(b.label));
}

export function weeklyTradeNumberChartMetrics(rows:readonly JournalTradeRow[],weekStart:string):WeeklyInteractiveMetric[]{
  const groups=weeklyTradeNumberBreakdown(rows,weekStart);
  return groups.map(g=>{
    const members=rows.filter(row=>journalWeekStart(row.session_date)===weekStart&&
      (typeof row.session_trade_number==='number'&&Number.isSafeInteger(row.session_trade_number)&&row.session_trade_number>0?'Trade #'+row.session_trade_number:'Unknown trade number')===g.label);
    return {key:g.label,label:g.label,value:g.netR===null||g.eligibleRCount===0?null:g.netR/g.eligibleRCount,
      sample:g.eligibleRCount+'/'+g.closedCount+' closed R eligible · '+g.tradeCount+' Trades',
      tradeIds:members.filter(row=>row.status==='CLOSED'&&typeof row.realized_r==='number'&&Number.isFinite(row.realized_r)).map(row=>row.trade_id)};
  });
}

/** Chart and table share existing aggregate values. Match the exact eligible
 * population; unknown clock groups retain count coverage but no attributed R. */
export function weeklyContextChartMetrics(rows:readonly JournalTradeRow[],weekStart:string,mode:'instrument'|'weekday'|'hour'|'rules'):WeeklyInteractiveMetric[]{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const hourLabel=(row:JournalTradeRow)=>{
    const hour=localDecisionHour(row.decision_occurred_at,row.session_timezone_id);
    return hour&&row.session_timezone_id?row.session_timezone_id+' · '+hour+':00–'+hour+':59':'Unknown recorded Decision time / Session zone';
  };
  if(mode==='rules'){
    const buckets=['FOLLOWED','VIOLATED','UNCHECKED'] as const;
    return buckets.map(key=>{
      const members=weekly.filter(row=>(row.rule_status==='FOLLOWED'||row.rule_status==='VIOLATED'?row.rule_status:'UNCHECKED')===key);
      return {key,label:key==='FOLLOWED'?'No violation recorded':key==='VIOLATED'?'Violation recorded':'Unchecked / unknown',
        value:members.length,sample:members.length+'/'+weekly.length+' filtered Trades',tradeIds:members.map(row=>row.trade_id)};
    });
  }
  const groups=mode==='instrument'?weeklyTradeBreakdown(rows,weekStart,'instrument_symbol'):
    mode==='weekday'?weeklyWeekdayBreakdown(rows,weekStart):weeklyDecisionHourBreakdown(rows,weekStart);
  const labelFor=(row:JournalTradeRow)=>mode==='instrument'?row.instrument_symbol?.trim()||'Not recorded':
    mode==='weekday'?names[new Date(row.session_date+'T00:00:00Z').getUTCDay()]:hourLabel(row);
  return groups.map(g=>{
    const members=weekly.filter(row=>labelFor(row)===g.label);
    const eligible=g.eligibleRCount===0?[]:members.filter(row=>row.status==='CLOSED'&&typeof row.realized_r==='number'&&Number.isFinite(row.realized_r));
    return {key:g.label,label:g.label,value:g.netR===null||g.eligibleRCount===0?null:g.netR/g.eligibleRCount,
      sample:g.eligibleRCount+'/'+g.closedCount+' closed R eligible · '+g.tradeCount+' Trades',tradeIds:eligible.map(row=>row.trade_id)};
  });
}

/** Reuse exactly the same historical groups for charts and tabular summaries. */
export function weeklyProvenanceChartMetrics(rows:readonly JournalTradeRow[],weekStart:string,mode:'setup'|'source'|'evidence'):WeeklyInteractiveMetric[]{
  const groups=mode==='setup'?weeklySetupVersionBreakdownWithMembership(rows,weekStart):
    mode==='source'?weeklyLevelSourceBreakdownWithMembership(rows,weekStart):weeklyObservedEvidenceBreakdownWithMembership(rows,weekStart);
  return groups.map(g=>({
    key:g.identityKey,
    label:groups.filter(other=>other.label===g.label).length>1?g.label+' · '+g.identityKey:g.label,
    value:g.netR===null||g.eligibleRCount===0?null:g.netR/g.eligibleRCount,
    sample:g.eligibleRCount+'/'+g.closedCount+' closed R eligible · '+g.tradeCount+' Trades',
    tradeIds:g.eligibleTradeIds,
  }));
}

export function weeklyMistakeOutcomeText(groups:readonly WeeklyMistakeOutcome[]):string{
  return groups.length?groups.map(g=>g.label+': '+g.tradeCount+'/'+g.weekTradeCount+
    ' tagged Trades; '+g.eligibleRCount+'/'+g.closedCount+' closed R eligible; '+
    g.lossCount+' known losing Trades; negative R sum '+(g.lossR===null?'UNKNOWN':g.lossR.toFixed(2))+
    '; net R '+(g.netR===null?'UNKNOWN':g.netR.toFixed(2))).join(' | '):'No mistake tags recorded';
}

/** Same definition as native summary: saved C/INVALID quality and positive
 * known net P&L on a CLOSED Trade, independent of whether R is eligible. */
export function weeklyBadDecisionWins(rows:readonly JournalTradeRow[],weekStart:string):JournalTradeRow[]{
  return rows.filter(row=>journalWeekStart(row.session_date)===weekStart&&row.status==='CLOSED'&&
    (row.decision_quality==='C'||row.decision_quality==='INVALID')&&
    typeof row.net_realized_pnl==='number'&&Number.isFinite(row.net_realized_pnl)&&row.net_realized_pnl>1e-9);
}

export type WeeklyDecisionOutcome='WIN'|'LOSS'|'BREAKEVEN'|'UNKNOWN'|'NOT_CLOSED';
export type WeeklyDecisionOutcomeGroup=Readonly<{
  quality:string;outcome:WeeklyDecisionOutcome;tradeIds:readonly string[];count:number;
}>;
/** Financial sign uses known CLOSED net P&L, independent of initial-risk
 * eligibility. Same positive threshold as native bad-decision-win count. */
export function weeklyDecisionOutcomeGroups(rows:readonly JournalTradeRow[],weekStart:string):WeeklyDecisionOutcomeGroup[]{
  const groups=new Map<string,{quality:string;outcome:WeeklyDecisionOutcome;tradeIds:string[]}>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const quality=row.decision_quality?.trim()||'Not recorded';
    const net=row.net_realized_pnl;
    const outcome:WeeklyDecisionOutcome=row.status!=='CLOSED'?'NOT_CLOSED':
      typeof net!=='number'||!Number.isFinite(net)?'UNKNOWN':net>1e-9?'WIN':net< -1e-9?'LOSS':'BREAKEVEN';
    const key=JSON.stringify([quality,outcome]);
    const group=groups.get(key)||{quality,outcome,tradeIds:[]};
    group.tradeIds.push(row.trade_id);groups.set(key,group);
  }
  const qualityOrder=['A','B','C','INVALID','UNCLEAR','Not recorded'];
  const order:WeeklyDecisionOutcome[]=['WIN','LOSS','BREAKEVEN','UNKNOWN','NOT_CLOSED'];
  const rank=(quality:string)=>qualityOrder.includes(quality)?qualityOrder.indexOf(quality):qualityOrder.length;
  return [...groups.values()].map(g=>({...g,count:g.tradeIds.length})).sort((a,b)=>
    rank(a.quality)-rank(b.quality)||a.quality.localeCompare(b.quality)||order.indexOf(a.outcome)-order.indexOf(b.outcome));
}
export function weeklyDecisionOutcomeText(groups:readonly WeeklyDecisionOutcomeGroup[]):string{
  return groups.length?groups.map(g=>g.quality+' / '+g.outcome+': '+g.count).join(' | '):'No matching Trades';
}

export type WeeklyLearningSnapshot=Readonly<{
  weekStart:string;
  tradeCount:number;
  closedCount:number;
  openCount:number;
  eligibleRCount:number;
  missingRCount:number;
  correctedTradeCount:number;
  /** Distinct trades within each independent immutable audit family. Families may overlap. */
  fillCorrectedTradeCount:number;
  initialRiskCorrectedTradeCount:number;
  sourceTypeCorrectedTradeCount:number;
  sourcePriceCorrectedTradeCount:number;
  /** Individual revision events, NOT distinct trades. */
  fillCorrectionEventCount:number;
  initialRiskCorrectionEventCount:number;
  sourceTypeCorrectionEventCount:number;
  sourcePriceCorrectionEventCount:number;
  netR:number|null;
  /** Best/worst known net R among eligible CLOSED trade outcomes only. */
  largestWinnerR:number|null;
  largestLoserR:number|null;
  ruleViolationCount:number;
  uncheckedRuleCount:number;
  mistakes:readonly {id:string;label:string;count:number}[];
  observation:string;
  action:string;
  /** This only covers trades returned by the current journal filters. */
  scope:'FILTERED_TRADES_ONLY';
}>;

/** Read-only descriptive review of recorded trades, not a strategy signal or a
 * statistical edge. Does not count NO_TRADE/MISSED decisions that lack trades. */
export function weeklyLearningSnapshot(
  rows:readonly JournalTradeRow[],
  weekStart:string,
  mistakeCatalog:readonly MistakeSummary[]=[],
):WeeklyLearningSnapshot{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const closed=weekly.filter(row=>row.status==='CLOSED');
  const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
  const missingRCount=closed.length-eligible.length;
  // A single Trade can be corrected in multiple ways and a single source
  // may have multiple append-only revisions. Sum events for provenance,
  // but count a Trade only once in the overall affected-trade denominator.
  const validCount=(value:number|undefined)=>
    value!==undefined&&Number.isSafeInteger(value)&&value>=0?value:0;
  const fillCounts=weekly.map(row=>validCount(row.audited_correction_count));
  const riskCounts=weekly.map(row=>validCount(row.audited_initial_risk_correction_count));
  const sourceTypeCounts=weekly.map(row=>validCount(row.audited_source_type_correction_count));
  const sourcePriceCounts=weekly.map(row=>validCount(row.audited_source_price_correction_count));
  const affected=(counts:readonly number[])=>counts.filter(n=>n>0).length;
  const eventTotal=(counts:readonly number[])=>counts.reduce((sum,n)=>sum+n,0);
  const fillCorrectedTradeCount=affected(fillCounts);
  const initialRiskCorrectedTradeCount=affected(riskCounts);
  const sourceTypeCorrectedTradeCount=affected(sourceTypeCounts);
  const sourcePriceCorrectedTradeCount=affected(sourcePriceCounts);
  const correctedTradeCount=weekly.filter((_,i)=>
    fillCounts[i]>0||riskCounts[i]>0||sourceTypeCounts[i]>0||sourcePriceCounts[i]>0
  ).length;
  const count=new Map<string,{id:string;label:string;count:number}>();
  const labels=new Map(mistakeCatalog.map(m=>[m.mistake_type_id,m.label]));
  for(const row of weekly)for(const ref of recordedMistakeGroups(row)){
    const item=count.get(ref.key)||{id:ref.id??ref.label,label:labels.get(ref.id??ref.label)||ref.label,count:0};
    item.count++;count.set(ref.key,item);
  }
  const mistakes=[...count.values()]
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
  const violated=weekly.filter(row=>row.rule_status==='VIOLATED').length;
  const unchecked=weekly.filter(row=>row.rule_status==='UNCHECKED').length;
  const action=violated>0
    ? 'Review the recorded rule-violation trades and choose one specific rule to follow next week.'
    : mistakes.length>0
      ? 'Review the recorded "'+mistakes[0].label+'" cases and choose one observable process change for next week.'
      : missingRCount>0
        ? 'Review closed trades missing eligible net R; check cost and initial-risk records before interpreting performance.'
        : unchecked>0
          ? 'Review unchecked rule-adherence records before drawing process conclusions.'
          : 'Review representative decisions and write one concrete improvement for the next session.';
  const observation=weekly.length===0
    ? 'No trades in this selected week under the current filters.'
    : 'Descriptive sample only: '+weekly.length+' trades, '+closed.length+' closed, '+eligible.length+' eligible for net R; no causal trading edge is inferred.';
  return {
    weekStart,tradeCount:weekly.length,closedCount:closed.length,openCount:weekly.length-closed.length,
    eligibleRCount:eligible.length,missingRCount,correctedTradeCount,
    fillCorrectedTradeCount,initialRiskCorrectedTradeCount,
    sourceTypeCorrectedTradeCount,sourcePriceCorrectedTradeCount,
    fillCorrectionEventCount:eventTotal(fillCounts),
    initialRiskCorrectionEventCount:eventTotal(riskCounts),
    sourceTypeCorrectionEventCount:eventTotal(sourceTypeCounts),
    sourcePriceCorrectionEventCount:eventTotal(sourcePriceCounts),
    netR:eligible.length?eligible.reduce((total,row)=>total+(row.realized_r as number),0):null,
    largestWinnerR:eligible.some(row=>(row.realized_r as number)>0)
      ?Math.max(...eligible.map(row=>row.realized_r as number).filter(r=>r>0)):null,
    largestLoserR:eligible.some(row=>(row.realized_r as number)<0)
      ?Math.min(...eligible.map(row=>row.realized_r as number).filter(r=>r<0)):null,
    ruleViolationCount:violated,uncheckedRuleCount:unchecked,mistakes,
    observation,action,scope:'FILTERED_TRADES_ONLY',
  };
}

/** Draws on original NO_TRADE/MISSED aggregates only when the higher-priority
 * executed-trade integrity/process action has no specific trigger.
 * A MISSED label is not proof the opportunity was valid or profitable.
 */
export function weeklyDecisionAwareAction(
  snapshot:WeeklyLearningSnapshot,
  missedCount:number,
  reasonGroups:readonly {decision_type:string;reason_code:string;decision_count:number}[],
):string{
  if(snapshot.ruleViolationCount>0||snapshot.mistakes.length>0||
     snapshot.missingRCount>0||snapshot.uncheckedRuleCount>0)return snapshot.action;
  if(!Number.isInteger(missedCount)||missedCount<=0)return snapshot.action;
  const missedReasons=reasonGroups.filter(row=>
    row.decision_type==='MISSED'&&row.reason_code!=='[NO_REASON]'&&
    row.reason_code!=='[FREE_TEXT_ONLY]'&&
    Number.isInteger(row.decision_count)&&row.decision_count>0);
  const ranked=[...missedReasons].sort((a,b)=>b.decision_count-a.decision_count||
    a.reason_code.localeCompare(b.reason_code));
  if(!ranked.length){
    return 'Review '+missedCount+' recorded MISSED decision(s); verify whether each opportunity was actually valid, then choose one observable improvement.';
  }
  const reason=ranked[0];
  return 'Review '+missedCount+' recorded MISSED decision(s), including '+
    reason.decision_count+' with reason '+reason.reason_code+
    '; verify opportunity validity before choosing one actionable prevention step.';
}

/** Three-part weekly reading aid; it does not save a review event, infer
 * repeatability, or rate strategy profitability from a sparse sample.
 */
export function weeklyThreePartReview(snapshot:WeeklyLearningSnapshot,
  setupGroups:readonly WeeklyTradeBreakdown[],missedCount:number|null,action:string,
):{setupCandidate:string;recordedConcern:string;nextAction:string}{
  const atEntry=[...setupGroups].filter(g=>g.label.includes(' · At entry · ID '));
  atEntry.sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
  const top=atEntry[0];
  const setupCandidate=top
    ? 'Most frequently recorded at-entry Setup: '+top.label+' ('+top.tradeCount+
      ' trades; '+top.eligibleRCount+'/'+top.closedCount+
      ' closed R-eligible). This is not evidence it is the best or repeatable.'
    : 'No at-entry Setup sample recorded under these filters. Do not infer a best setup.';
  const recordedConcern=snapshot.ruleViolationCount>0
    ? snapshot.ruleViolationCount+' trade(s) with recorded rule violations; inspect original decisions.'
    : snapshot.mistakes[0]
      ? snapshot.mistakes[0].label+' ('+snapshot.mistakes[0].count+' recorded trades); inspect individual cases.'
      : snapshot.missingRCount>0
        ? snapshot.missingRCount+' closed trade(s) lack eligible R; verify costs and initial risk.'
        : missedCount===null
          ? 'Decision-only MISSED counts unavailable; do not treat missing decision data as zero or claim no process issues.'
          : missedCount>0
            ? missedCount+' recorded MISSED decision(s); confirm opportunity validity before classifying a mistake.'
            : 'No ranked process issue identified from recorded rows; blank fields are not proof of flawless execution.';
  return {setupCandidate,recordedConcern,nextAction:action};
}

export function journalWeeks(rows:readonly JournalTradeRow[]):string[]{
  return [...new Set(rows.map(row=>journalWeekStart(row.session_date)).filter((x):x is string=>x!==null))].sort().reverse();
}

export function weeklyLearningText(snapshot:WeeklyLearningSnapshot,levelSources:readonly WeeklyTradeBreakdown[]=[],decisionContext?:{missed:number;noTrade:number;action:string},setupContext?:{setups:readonly WeeklyTradeBreakdown[];definedContexts:readonly WeeklyTradeBreakdown[]},observedEvidence:readonly WeeklyTradeBreakdown[]=[]):string{
  return [
    'PTJ weekly learning — week of '+snapshot.weekStart,
    'Scope: trade metrics use filtered recorded trades only. Decision-only counts, when present, use date/instrument filters and are NOT limited by trade-only filters.',
    'Trades: '+snapshot.tradeCount+'; closed: '+snapshot.closedCount+'; open/other: '+snapshot.openCount+'.',
    'Net R eligible: '+snapshot.eligibleRCount+'/'+snapshot.closedCount+' closed; missing eligible R: '+snapshot.missingRCount+'.',
    'Sum of eligible net R: '+(snapshot.netR==null?'unknown':snapshot.netR.toFixed(2)+'R')+'.',
    'Largest known closed winner: '+(snapshot.largestWinnerR===null?'not recorded':snapshot.largestWinnerR.toFixed(2)+'R')+
      '; largest known closed loser: '+(snapshot.largestLoserR===null?'not recorded':snapshot.largestLoserR.toFixed(2)+'R')+
      '. Only R-eligible closed Trades; missing-R outcomes are excluded, not zero.',
    'Audited-correction affected trades (all four families; each Trade counted once): '+snapshot.correctedTradeCount+
      '. Fill costs: '+snapshot.fillCorrectedTradeCount+' trade(s) / '+snapshot.fillCorrectionEventCount+' event(s)'+
      '; Initial Risk: '+snapshot.initialRiskCorrectedTradeCount+' trade(s) / '+snapshot.initialRiskCorrectionEventCount+' event(s)'+
      '; Level Source type: '+snapshot.sourceTypeCorrectedTradeCount+' trade(s) / '+snapshot.sourceTypeCorrectionEventCount+' event(s)'+
      '; Level Source price: '+snapshot.sourcePriceCorrectedTradeCount+' trade(s) / '+snapshot.sourcePriceCorrectionEventCount+' event(s).'+
      ' Category-specific trade counts may overlap. Reported results use effective values; original event records and reasons remain in the audit history.',
    'Rule violations: '+snapshot.ruleViolationCount+'; rule status unchecked: '+snapshot.uncheckedRuleCount+'.',
    'Most frequent recorded mistake: '+(snapshot.mistakes[0]?snapshot.mistakes[0].label+' ('+snapshot.mistakes[0].count+' trades)':'none recorded')+'.',
    'Decision-time level source groups (overlapping; do not sum group samples/R): '+(levelSources.length?levelSources.map(g=>g.label+' ['+g.tradeCount+' linked trades, '+g.eligibleRCount+'/'+g.closedCount+' R eligible, '+(g.netR===null?'R unknown':g.netR.toFixed(2)+'R')+']').join('; '):'none in the selected week')+'.',
    'Decision-only events: '+(decisionContext?'NO_TRADE '+decisionContext.noTrade+'; MISSED '+decisionContext.missed+'.':'unavailable in this trade-only summary.') ,
    'Setup versions (at entry vs retrospective, no inferred observation): '+(setupContext?.setups.length?setupContext.setups.map(g=>g.label+' ['+g.eligibleRCount+'/'+g.closedCount+' eligible, '+(g.netR===null?'R unknown':g.netR.toFixed(2)+'R')+']').join('; '):'none')+'.',
    'Setup-defined context (not observed market conditions): '+(setupContext?.definedContexts.length?setupContext.definedContexts.map(g=>g.label+' ['+g.tradeCount+' trades, '+g.eligibleRCount+'/'+g.closedCount+' eligible R]').join('; '):'none')+'.',
    'Evidence timing relative to original Decision (verified at/before, after, or unknown; overlapping groups, not plan assertions): '+(observedEvidence.length?observedEvidence.map(g=>g.label+' ['+g.tradeCount+' trades, '+g.eligibleRCount+'/'+g.closedCount+' R eligible]').join('; '):'not separately available')+'.',
    'Suggested review action (not proven trading advice): '+(decisionContext?.action??snapshot.action),
    'Record an approved personal action separately; this read-only summary does not save a review event.',
  ].join('\n');
}

/** Closed recorded outcomes grouped by original currency. Gross and net each
 * retain their own denominator. Cost = gross - net only for paired known values.
 * Never aggregate different or unknown currencies; never replace missing with 0. */
export type WeeklyMoneyGroup=Readonly<{
  currency:string|null; closedCount:number; grossCount:number; netCount:number; costCount:number;
  gross:number|null; net:number|null; costs:number|null;
}>;
export function weeklyMoneyBreakdown(rows:readonly JournalTradeRow[],weekStart:string):WeeklyMoneyGroup[]{
  const groups=new Map<string|null,JournalTradeRow[]>();
  for(const row of rows){
    if(row.status!=='CLOSED'||journalWeekStart(row.session_date)!==weekStart)continue;
    const currency=row.pnl_currency&&/^[A-Z]{3}$/.test(row.pnl_currency)?row.pnl_currency:null;
    const items=groups.get(currency)??[];items.push(row);groups.set(currency,items);
  }
  const known=(v:number|null|undefined):v is number=>typeof v==='number'&&Number.isFinite(v);
  const sum=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0):null;
  return [...groups].map(([currency,items])=>{
    const gross=items.flatMap(r=>known(r.gross_realized_pnl)?[r.gross_realized_pnl]:[]);
    const net=items.flatMap(r=>known(r.net_realized_pnl)?[r.net_realized_pnl]:[]);
    const costs=items.flatMap(r=>known(r.gross_realized_pnl)&&known(r.net_realized_pnl)?[r.gross_realized_pnl-r.net_realized_pnl]:[]);
    return {currency,closedCount:items.length,grossCount:gross.length,netCount:net.length,costCount:costs.length,
      gross:currency?sum(gross):null,net:currency?sum(net):null,costs:currency?sum(costs):null};
  }).sort((a,b)=>a.currency===null?1:b.currency===null?-1:a.currency.localeCompare(b.currency));
}
export function weeklyMoneyText(groups:readonly WeeklyMoneyGroup[]):string{
  const label=(v:number|null)=>v===null?'unknown':v.toFixed(2);
  return groups.length?groups.map(g=>(g.currency??'Unknown historical currency (totals withheld)')+
    ': gross '+label(g.gross)+' ('+g.grossCount+'/'+g.closedCount+'), costs '+label(g.costs)+' ('+g.costCount+'/'+g.closedCount+
    '), net '+label(g.net)+' ('+g.netCount+'/'+g.closedCount+')').join('; '):'No closed trades';
}

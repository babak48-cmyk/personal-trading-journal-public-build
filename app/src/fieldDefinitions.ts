// Display-only market outlook vocabulary; persisted bias codes remain unchanged.
export const MARKET_OUTLOOK_VALUES = ['LONG','SHORT','NEUTRAL','MIXED','UNKNOWN'] as const;
const MARKET_OUTLOOK_LABELS: Record<string,string> = {LONG:'Bullish',SHORT:'Bearish',NEUTRAL:'Sideways',MIXED:'Mixed',UNKNOWN:'Unclear'};
export function marketOutlookLabel(value:string|null|undefined):string {
  return value && Object.prototype.hasOwnProperty.call(MARKET_OUTLOOK_LABELS,value) ? MARKET_OUTLOOK_LABELS[value] : 'Unclear';
}

export type RequirementDefault = 'SYSTEM_REQUIRED'|'OPTIONAL'|'CONDITIONAL';
export type FieldGroup = 'Session'|'Plan'|'Candidate'|'Evidence'|'Decision'|'Trade'|'Review'|'Psychology'|'SessionReview'|'Attachment'|'Setup';

export type FieldDefinition = {
  id:string;
  group:FieldGroup;
  label:string;
  defaultRequirement:RequirementDefault;
  systemLocked:boolean;
  requirementManaged?:boolean;
  advanced?:boolean;
  conditionalText?:string;
  helpShort:string;
  helpExample:string;
  helpLong?:string;
  optionHelp?:Record<string,string>;
};

export const FIELD_DEFINITIONS:FieldDefinition[] = [
  {"id":"fill.fees","group":"Trade","label":"Fill other fees (total)","defaultRequirement":"OPTIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Total other fees for this fill. Blank is unknown; zero is explicit.","helpExample":"0.50"},
  {"id":"fill.commission","group":"Trade","label":"Fill commission (total)","defaultRequirement":"OPTIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Total commission for this fill. Blank is unknown; zero is explicit.","helpExample":"2.00"},
  {"id":"trade.entryFees","group":"Trade","label":"Entry other fees (total)","defaultRequirement":"OPTIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Total other fees for the entry fill. Blank is unknown; zero is explicit.","helpExample":"0.50"},
  {"id":"trade.entryCommission","group":"Trade","label":"Entry commission (total)","defaultRequirement":"OPTIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Total commission for the entry fill. Blank is unknown; zero is explicit.","helpExample":"2.00"},
  {"id":"decision.mismatchReason","group":"Decision","label":"Opposite-plan explanation","defaultRequirement":"CONDITIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Explain why the intended trade opposes the plan when applicable.","helpExample":"New evidence."},
  {"id":"decision.direction","group":"Decision","label":"Intended trade direction","defaultRequirement":"CONDITIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Explicit long or short intent for a TRADE decision.","helpExample":"LONG"},
  {"id":"management.newStop","group":"Trade","label":"Revised stop","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Record the new stop for a management event, not the original risk.","helpExample":"Move stop to 7400."},
  {"id":"fill.quantity","group":"Trade","label":"Fill quantity","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Actual quantity executed.","helpExample":"1 contract"},
  {"id":"fill.price","group":"Trade","label":"Fill price","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Actual executed market price.","helpExample":"7402.25"},
  {"id":"fill.action","group":"Trade","label":"Fill action","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Record an actual entry or exit fill.","helpExample":"Partial exit."},
  {"id":"liveZone.reason","group":"Candidate","label":"New live zone reason","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Explain why a zone is added during the active session.","helpExample":"New liquidity information."},
  {"id":"candidateRevision.reason","group":"Candidate","label":"Zone revision reason","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Explain the change to an existing zone.","helpExample":"New structure changed the zone boundary."},
  {"id":"planRevision.reason","group":"Plan","label":"Plan revision reason","defaultRequirement":"SYSTEM_REQUIRED","systemLocked":true,"requirementManaged":false,"helpShort":"Explain why the plan changed; retain the original revision.","helpExample":"New evidence invalidated the original scenario."},
  {"id":"planRevision.bias","group":"Plan","label":"Revised market outlook","defaultRequirement":"OPTIONAL","systemLocked":true,"requirementManaged":false,"helpShort":"Change the outlook or retain the existing one.","helpExample":"Keep current when only the evidence changes."},
  // Approval-critical Setup semantics are enforced by Rust; Field Manager may
  // rename/reorder these visible inputs, never weaken their validation or hide them.
  {id:'setup.marketContext',group:'Setup',label:'Market regime/context',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Describe the market regime applicable to this setup. Required to approve, not required to save a Draft.',helpExample:'Range boundary rejection; compare against acceptance.'},
  {id:'setup.zoneLocation',group:'Setup',label:'Location / relevant Zone',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Define the qualifying Zone or level with provenance. Required to approve a Setup.',helpExample:'Prior-day VAH with a marked provenance source.'},
  {id:'setup.prerequisites',group:'Setup',label:'Prerequisite conditions',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Record conditions that must be true before this setup is considered. Required to approve.',helpExample:'Known level and matching market context.'},
  {id:'setup.entryTriggers',group:'Setup',label:'Critical entry triggers',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Define future observed entry triggers; a definition is not evidence that the trigger occurred. Required to approve.',helpExample:'Wait for observed rejection after touch.'},
  {id:'setup.supportingEvidence',group:'Setup',label:'Supporting confirmations',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Optional descriptive supporting evidence. Do not turn it into an arbitrary score or an approval gate.',helpExample:'DOM pressure may strengthen, not independently validate, the thesis.'},
  {id:'setup.contraryEvidence',group:'Setup',label:'Contradictory / veto evidence',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Identify conflicting evidence or veto conditions. Required to approve.',helpExample:'Sustained price acceptance beyond the zone.'},
  {id:'setup.invalidation',group:'Setup',label:'Thesis invalidation',defaultRequirement:'CONDITIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Define when the entire thesis becomes invalid; separate from an order stop. Required to approve.',helpExample:'Acceptance above boundary invalidates the short thesis.'},
  // Setup Playbook remains a versioned definition. Only these OPTIONAL
  // presentation controls are connected; approval-critical fields retain
  // native Rust validation and cannot be hidden.
  {id:'setup.sourceTrade',group:'Setup',label:'Historical source trade',defaultRequirement:'OPTIONAL',systemLocked:false,requirementManaged:false,
    helpShort:'Optional historical CLOSED trade used as a source for an editable definition; it is not a decision-time attribution.',
    helpExample:'Use a previously closed ES trade to prefill known Zone/context facts, then review them.'},
  {id:'setup.notes',group:'Setup',label:'Setup notes',defaultRequirement:'OPTIONAL',systemLocked:false,requirementManaged:false,
    helpShort:'Optional notes on this immutable Setup version. Hiding the editor input retains existing version text.',
    helpExample:'Watch for changing behavior at the level; this is not a trading confirmation.'},
  {id:'setup.evidenceHelp',group:'Setup',label:'New evidence explanation',defaultRequirement:'OPTIONAL',systemLocked:false,requirementManaged:false,
    helpShort:'Optional explanation of a proposed evidence-priority row. The entered text is not saved until the row is added.',
    helpExample:'DOM pressure is supporting context, not an automatic approval to enter.'},
  {id:'session.date',group:'Session',label:'Date',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The trading-session date used to group the plan, decisions and trades.',helpExample:'If you trade the Sydney evening session on 8 Oct, keep the session date as 2026-10-08.',helpLong:'Session date is separate from exact event timestamps. It is the journal bucket you review later.'},
  {id:'session.instrument',group:'Session',label:'Instrument',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The market/contract this session is about.',helpExample:'ES for E-mini S&P 500 or GC for Gold futures.',helpLong:'The session stores a snapshot of the instrument specification so later registry edits do not rewrite old calculations.'},
  {id:'session.environment',group:'Session',label:'Environment',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'Whether the session is real money, demo, or forward testing.',helpExample:'Use DEMO when rehearsing execution without live capital.',optionHelp:{REAL:'Live/real-money trading.',DEMO:'Simulated/demo execution.',FORWARD_TEST:'Forward-testing a method in current market conditions.'}},

  {id:'plan.bias',group:'Plan',label:'Market Outlook',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'Your initial directional view before the session develops.',helpExample:'Bearish if your base case expects lower prices, but you still record contrary evidence.',helpLong:'Market outlook is a hypothesis, not a trade direction or a command to trade. It can later change through a plan revision.',optionHelp:{LONG:'Base case favors higher prices.',SHORT:'Base case favors lower prices.',NEUTRAL:'Your base case is sideways or lacks a preferred directional move.',MIXED:'Different scenarios point in different directions.',UNKNOWN:'You do not yet have enough information to form a view.'}},
  {id:'plan.mainScenario',group:'Plan',label:'Main scenario',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'The primary market path you expect and what would make it actionable.',helpExample:'If ES holds below prior-day POC, look for rejection on a retest before considering a short.',helpLong:'Describe the expected sequence rather than only a direction. This makes later decision-quality review more useful.'},
  {id:'plan.alternativeScenario',group:'Plan',label:'Alternative scenario',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A credible alternate path if the main scenario does not develop.',helpExample:'If price accepts back above the zone, abandon the short thesis and watch for continuation higher.'},
  {id:'plan.preSessionState',group:'Plan',label:'Pre-session state',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A quick check of your mental/physical state before trading.',helpExample:'FOCUSED, TIRED or DISTRACTED.',helpLong:'This is intentionally lightweight. It helps find patterns without turning psychology logging into a long questionnaire.'},

  {id:'plan.preSessionStateIntensity',group:'Plan',label:'Pre-session intensity',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional 1–5 rating of your pre-session state. This is descriptive, not a trading edge or threshold.',helpExample:'3 means a moderate intensity of the state you selected.'},

  {id:'candidate.intent',group:'Candidate',label:'Directional intent',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'What the level/zone is currently being watched for.',helpExample:'LONG means the zone is a candidate area for a long thesis, not that a trade is already approved.',optionHelp:{LONG:'Watch for a long-side opportunity.',SHORT:'Watch for a short-side opportunity.',CONDITIONAL:'Direction depends on how price interacts with the area.',WATCH:'Important location to monitor without a directional commitment.',UNKNOWN:'Intent is not clear yet.'}},
  {id:'candidate.trendRelationship',group:'Candidate',label:'Role vs trend',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'How the candidate thesis relates to the broader price trend.',helpExample:'COUNTERTREND: considering a short at resistance while the broader move is still upward.',helpLong:'This describes context, not quality. A countertrend trade is not automatically bad; it simply has different context and risk.',optionHelp:{WITH_TREND:'The trade idea follows the prevailing trend.',COUNTERTREND:'The idea goes against the prevailing trend, often expecting a correction or rejection.',CONTINUATION_AFTER_CORRECTION:'The idea waits for a pullback/correction, then joins the original trend.',REVERSAL:'The thesis expects the prevailing trend to change direction.',NA:'Trend relationship is not meaningful for this setup.',UNCLEAR:'The broader trend relationship is ambiguous.'}},
  {id:'candidate.priceMode',group:'Candidate',label:'Price mode',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Whether the candidate is defined by a zone, one exact price, or no fixed price yet.',helpExample:'Use RANGE for 6448.00–6450.00; SINGLE for a precise POC at 6449.25.',optionHelp:{RANGE:'A price zone between From and To.',SINGLE:'One exact reference price.',UNSPECIFIED:'The location matters conceptually but no exact price is fixed yet.'}},
  {id:'candidate.price',group:'Candidate',label:'Price / range',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required when price mode is Single or Range',
    helpShort:'The exact location where this candidate thesis matters.',helpExample:'Range 6448.00–6450.00 or single price 6449.25.'},
  {id:'candidate.label',group:'Candidate',label:'Zone name',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional human-readable name for this planned zone.',helpExample:'Prior-day high retest. This name does not replace zone identity or provenance.'},
  {id:'candidate.sources',group:'Candidate',label:'Level source',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Why this price/location is important before entry evidence appears.',helpExample:'Prior-day POC + hourly POC + a previously marked reaction level.',helpLong:'Source/provenance is separate from evidence. A Big Trade historical level may explain why you watch a location; a new Big Trade at entry time is evidence.'},
  {id:'candidate.requiredConditions',group:'Candidate',label:'Need to see',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'What must happen at the location before the trade becomes acceptable.',helpExample:'Price rejects the level, absorption appears, then delta shifts in the intended direction.',helpLong:'Keep this as observable conditions. It is your pre-commitment filter against entering just because price reached a level.'},
  {id:'candidate.invalidationConditions',group:'Candidate',label:'Abandon if',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'What would invalidate the candidate thesis before or around entry.',helpExample:'Price accepts above the zone and holds there; the original rejection thesis is no longer valid.',helpLong:'Invalidation is not the same as a stop distance. It describes when the market thesis itself is no longer valid.'},

  {id:'planRevision.evidence',group:'Plan',label:'New evidence summary for plan revision',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Summarize observed information behind a timestamped change to the market plan, without replacing the original plan.',helpExample:'A sustained acceptance above the previously watched resistance prompted a new plan revision.'},

  {id:'evidence.direction',group:'Evidence',label:'Observed direction',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Direction of this actual observation, not the planned Zone direction. Neutral remains the existing fallback when you leave this optional field unanswered.',helpExample:'BUY for observed buy-side activity, SELL for sell-side, or NEUTRAL if no directional interpretation is justified.'},

  {id:'evidence.price',group:'Evidence',label:'Observed price',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Market price where the evidence was actually observed, if known.',helpExample:'ES 6025.25 for a contemporaneous absorption observation; do not invent a price.'},
  {id:'evidence.note',group:'Evidence',label:'Evidence note',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Short description of what you actually observed at this moment.',helpExample:'Sellers repeatedly hit the bid but price held; observed evidence is not premarket provenance.'},

  {id:'decision.type',group:'Decision',label:'Decision',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'What you actually decided when the candidate became actionable.',helpExample:'NO_TRADE if the level was reached but required confirmation never appeared.',optionHelp:{TRADE:'You decided to enter and will record execution separately.',NO_TRADE:'You deliberately chose not to trade.',MISSED:'A valid opportunity may have existed, but you did not execute it.'}},
  {id:'decision.reason',group:'Decision',label:'Decision reason',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required for No-trade and Missed',
    helpShort:'Why you did not trade or why the opportunity was missed.',helpExample:'NO_TRADE because confirmation was missing; MISSED because you noticed the setup too late.'},
  {id:'decision.note',group:'Decision',label:'Decision note',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional context explaining this decision at the time it was made.',helpExample:'Waited because the observed entry conditions were incomplete.'},
  {id:'decision.quality',group:'Decision',label:'Decision quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Quality of the decision process, independent of whether the trade made or lost money.',helpExample:'A disciplined trade that followed the plan can be A-quality even if it loses.',helpLong:'Keep process and P&L separate. Good Decision + Loss and Bad Decision + Win are both meaningful outcomes.',optionHelp:{A:'Strong process: aligned with plan/rules and evidence.',B:'Generally sound decision with a minor weakness.',C:'Material process weakness, even if the outcome was profitable.',INVALID:'The decision cannot be fairly graded from available information.',UNCLEAR:'Not enough clarity yet to assign A/B/C.'}},

  {id:'trade.entryPrice',group:'Trade',label:'Entry price',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The actual executed entry price, not the planned level.',helpExample:'6451.00 if that is where the entry fill occurred.'},
  {id:'trade.stopPrice',group:'Trade',label:'Stop price',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The initial protective stop used to define initial risk.',helpExample:'6445.00 for a long entered at 6451.00.',helpLong:'Later stop moves are separate immutable events. Initial risk remains available for R calculations.'},
  {id:'trade.quantity',group:'Trade',label:'Quantity',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'Number of contracts/shares in the initial entry fill.',helpExample:'3 contracts if the trade begins with three contracts.'},
  {id:'trade.plannedTarget',group:'Trade',label:'Planned target',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'The target you intended at entry, if you use a predefined target.',helpExample:'6463.00 for a long from 6451.00.',helpLong:'Leave it optional when the setup legitimately uses discretionary or structure-based exits.'},

  {id:'attachment.caption',group:'Attachment',label:'Screenshot caption',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional explanation attached to a newly imported screenshot; make it Required only if every new screenshot should carry context.',helpExample:'Before entry: ES bid absorption at the level. Older screenshots keep their original captions.'},

  {id:'fill.reason',group:'Trade',label:'Fill reason',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Reason for this additional entry or exit fill, captured with its execution event rather than as a retrospective review.',helpExample:'Partial exit at first target; leave empty unless useful or explicitly configured Required.'},
  {id:'management.reason',group:'Trade',label:'Stop management reason',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Why the stop was revised, separately from original stop price and thesis invalidation.',helpExample:'Moved to breakeven after structure changed; this does not overwrite the original risk snapshot.'},

  {id:'review.exitReason',group:'Review',label:'Exit reason',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Why the position was closed; record an observed reason, not a planned target.',helpExample:'STOP or TARGET, only when that describes the actual exit.'},
  {id:'review.exitNote',group:'Review',label:'Exit note',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional context about the actual exit.',helpExample:'Reduced exposure after observed market conditions changed.'},
  {id:'review.mistakes',group:'Review',label:'Recorded mistakes',defaultRequirement:'OPTIONAL',systemLocked:false,requirementManaged:false,
    helpShort:'Select actual process mistakes observed in this trade. Optional by default.',helpExample:'Chasing entry or moving a protective stop without a valid reason. Do not infer mistakes from P&L alone.'},
  {id:'review.note',group:'Review',label:'Review note',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Concise post-trade learning note, separate from the original plan.',helpExample:'Followed the setup but managed the exit early.'},
  {id:'review.decisionQuality',group:'Review',label:'Decision quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Your post-trade grade for the decision itself, independent of P&L.',helpExample:'A losing trade can still receive A if the decision was correct and disciplined.',optionHelp:{A:'Strong process.',B:'Mostly sound with a minor issue.',C:'Material decision weakness.',INVALID:'Cannot be validly graded.',UNCLEAR:'Insufficient clarity.'}},
  {id:'review.executionQuality',group:'Review',label:'Execution quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'How well you executed the intended entry and order mechanics.',helpExample:'NEEDS IMPROVEMENT if you chased the entry even though the idea itself was valid.',optionHelp:{GOOD:'Execution matched the intended plan well.',ACCEPTABLE:'Usable execution with a small imperfection.',NEEDS_IMPROVEMENT:'A meaningful execution error occurred.',UNCLEAR:'Not enough information to judge.'}},
  {id:'review.managementQuality',group:'Review',label:'Management quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'How well you managed the open trade after entry.',helpExample:'NEEDS IMPROVEMENT if you widened the stop or exited early without evidence.',optionHelp:{GOOD:'Management followed the intended process well.',ACCEPTABLE:'Mostly sound with a minor issue.',NEEDS_IMPROVEMENT:'A meaningful management mistake occurred.',UNCLEAR:'Not enough information to judge.'}},

  {id:'sessionReview.wentWell',group:'SessionReview',label:'What went well?',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Identify a useful behavior or decision to repeat.',helpExample:'Followed the planned risk limit despite a losing trade.'},
  {id:'sessionReview.nextImprovement',group:'SessionReview',label:'One thing to improve next session',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Name one concrete action to try in the next session.',helpExample:'Wait for the specified entry confirmation before committing.'},
  {id:'sessionReview.wentPoorly',group:'SessionReview',label:'What went poorly?',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Record the most important process weakness without duplicating every trade note.',helpExample:'Entered early before the level reaction was established.'},
  {id:'sessionReview.bestDecision',group:'SessionReview',label:'Best decision',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A disciplined decision can be a no-trade or a losing trade.',helpExample:'Skipped a trade because invalidation had already occurred.'},
  {id:'sessionReview.biggestMistake',group:'SessionReview',label:'Biggest mistake',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Capture the most significant process error, if one occurred.',helpExample:'Moved the initial stop without a valid management reason.'},
  {id:'sessionReview.marketLearning',group:'SessionReview',label:'What did the market teach me?',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Capture one observation that may inform the next plan, not a proven edge.',helpExample:'Acceptance above the prior level challenged my rejection hypothesis.'},

  {id:'sessionReview.overall',group:'SessionReview',label:'Overall session assessment',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Your overall session process assessment, separate from net P&L.',helpExample:'ACCEPTABLE if you followed most of the plan with one execution slip.'},
  {id:'sessionReview.planQuality',group:'SessionReview',label:'Plan quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Evaluate whether the plan was clear and useful before judging the outcome.',helpExample:'GOOD if the plan defined clear zones, conditions and invalidation.'},
  {id:'sessionReview.discipline',group:'SessionReview',label:'Discipline',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Assess adherence to planned rules and risk limits independently of profit.',helpExample:'NEEDS_IMPROVEMENT if a trade broke your pre-committed risk cap.'},

  {id:'rule.note',group:'Review',label:'Rule violation note',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A concise explanation only if a rule violation was reported. The absence of a violation never requires a note.',helpExample:'Entered before the planned confirmation despite the original rule.'},

  {id:'psychology.emotionAffected',group:'Psychology',label:'Did emotion affect the trade?',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Only mark Yes when emotion materially changed entry, management or exit.',helpExample:'Yes if FOMO made you chase; No if you felt nervous but still followed the plan.'},
  {id:'psychology.intensity',group:'Psychology',label:'Emotion intensity',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Optional 1–5 intensity only when emotion affected this trade. It measures experience, not profitability.',helpExample:'4 when FOMO strongly influenced your entry.'},
  {id:'psychology.state',group:'Psychology',label:'Psychology state',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required when emotion affected the trade',
    helpShort:'The main emotional/mental state that influenced the trade.',helpExample:'Hesitation, FOMO, frustration, revenge or overconfidence.'},
  {id:'psychology.stage',group:'Psychology',label:'Affected stage',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required when emotion affected the trade',
    helpShort:'Where in the trade the emotional effect occurred.',helpExample:'ENTRY if hesitation delayed the entry; MANAGEMENT if fear caused an early stop move.',optionHelp:{ENTRY:'Emotion affected the entry decision or timing.',MANAGEMENT:'Emotion affected decisions while the trade was open.',EXIT:'Emotion affected the exit decision or timing.',MULTIPLE:'Emotion affected more than one stage.'}},
];

export const FIELD_DEFINITION_BY_ID = Object.fromEntries(FIELD_DEFINITIONS.map(x=>[x.id,x])) as Record<string,FieldDefinition>;

export type RequirementOverrides = Record<string,boolean>;

export function isUserRequired(id:string,overrides:RequirementOverrides){
  const def=FIELD_DEFINITION_BY_ID[id];
  return !!def && def.requirementManaged!==false && !def.systemLocked && !!overrides[id];
}

export function requirementLabel(id:string,overrides:RequirementOverrides){
  const def=FIELD_DEFINITION_BY_ID[id];
  if(!def)return 'Optional';
  if(def.requirementManaged===false)return 'Optional';
  if(def.defaultRequirement==='SYSTEM_REQUIRED')return 'Required';
  if(def.defaultRequirement==='CONDITIONAL')return 'Conditional';
  return isUserRequired(id,overrides)?'Required by you':'Optional';
}

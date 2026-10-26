export type RequirementDefault = 'SYSTEM_REQUIRED'|'OPTIONAL'|'CONDITIONAL';
export type FieldGroup = 'Session'|'Plan'|'Candidate'|'Decision'|'Trade'|'Review'|'Psychology';

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
  {id:'session.date',group:'Session',label:'Date',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The trading-session date used to group the plan, decisions and trades.',helpExample:'If you trade the Sydney evening session on 8 Oct, keep the session date as 2026-10-08.',helpLong:'Session date is separate from exact event timestamps. It is the journal bucket you review later.'},
  {id:'session.instrument',group:'Session',label:'Instrument',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'The market/contract this session is about.',helpExample:'ES for E-mini S&P 500 or GC for Gold futures.',helpLong:'The session stores a snapshot of the instrument specification so later registry edits do not rewrite old calculations.'},
  {id:'session.environment',group:'Session',label:'Environment',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'Whether the session is real money, demo, or forward testing.',helpExample:'Use DEMO when rehearsing execution without live capital.',optionHelp:{REAL:'Live/real-money trading.',DEMO:'Simulated/demo execution.',FORWARD_TEST:'Forward-testing a method in current market conditions.'}},

  {id:'plan.bias',group:'Plan',label:'Bias',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'Your initial directional view before the session develops.',helpExample:'SHORT if your base case expects lower prices, but you still record contrary evidence.',helpLong:'Bias is a hypothesis, not a command to trade. It can later change through a plan revision.',optionHelp:{LONG:'Base case favors higher prices.',SHORT:'Base case favors lower prices.',NEUTRAL:'No directional edge is currently preferred.',MIXED:'Different scenarios point in different directions.',UNKNOWN:'You do not yet have enough information to form a view.'}},
  {id:'plan.mainScenario',group:'Plan',label:'Main scenario',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'The primary market path you expect and what would make it actionable.',helpExample:'If ES holds below prior-day POC, look for rejection on a retest before considering a short.',helpLong:'Describe the expected sequence rather than only a direction. This makes later decision-quality review more useful.'},
  {id:'plan.alternativeScenario',group:'Plan',label:'Alternative scenario',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A credible alternate path if the main scenario does not develop.',helpExample:'If price accepts back above the zone, abandon the short thesis and watch for continuation higher.'},
  {id:'plan.preSessionState',group:'Plan',label:'Pre-session state',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'A quick check of your mental/physical state before trading.',helpExample:'FOCUSED, TIRED or DISTRACTED.',helpLong:'This is intentionally lightweight. It helps find patterns without turning psychology logging into a long questionnaire.'},

  {id:'candidate.intent',group:'Candidate',label:'Directional intent',defaultRequirement:'SYSTEM_REQUIRED',systemLocked:true,
    helpShort:'What the level/zone is currently being watched for.',helpExample:'LONG means the zone is a candidate area for a long thesis, not that a trade is already approved.',optionHelp:{LONG:'Watch for a long-side opportunity.',SHORT:'Watch for a short-side opportunity.',CONDITIONAL:'Direction depends on how price interacts with the area.',WATCH:'Important location to monitor without a directional commitment.',UNKNOWN:'Intent is not clear yet.'}},
  {id:'candidate.trendRelationship',group:'Candidate',label:'Role vs trend',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'How the candidate thesis relates to the broader price trend.',helpExample:'COUNTERTREND: considering a short at resistance while the broader move is still upward.',helpLong:'This describes context, not quality. A countertrend trade is not automatically bad; it simply has different context and risk.',optionHelp:{WITH_TREND:'The trade idea follows the prevailing trend.',COUNTERTREND:'The idea goes against the prevailing trend, often expecting a correction or rejection.',CONTINUATION_AFTER_CORRECTION:'The idea waits for a pullback/correction, then joins the original trend.',REVERSAL:'The thesis expects the prevailing trend to change direction.',NA:'Trend relationship is not meaningful for this setup.',UNCLEAR:'The broader trend relationship is ambiguous.'}},
  {id:'candidate.priceMode',group:'Candidate',label:'Price mode',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'Whether the candidate is defined by a zone, one exact price, or no fixed price yet.',helpExample:'Use RANGE for 6448.00–6450.00; SINGLE for a precise POC at 6449.25.',optionHelp:{RANGE:'A price zone between From and To.',SINGLE:'One exact reference price.',UNSPECIFIED:'The location matters conceptually but no exact price is fixed yet.'}},
  {id:'candidate.price',group:'Candidate',label:'Price / range',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required when price mode is Single or Range',
    helpShort:'The exact location where this candidate thesis matters.',helpExample:'Range 6448.00–6450.00 or single price 6449.25.'},
  {id:'candidate.sources',group:'Candidate',label:'Level source',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Why this price/location is important before entry evidence appears.',helpExample:'Prior-day POC + hourly POC + a previously marked reaction level.',helpLong:'Source/provenance is separate from evidence. A Big Trade historical level may explain why you watch a location; a new Big Trade at entry time is evidence.'},
  {id:'candidate.requiredConditions',group:'Candidate',label:'Need to see',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'What must happen at the location before the trade becomes acceptable.',helpExample:'Price rejects the level, absorption appears, then delta shifts in the intended direction.',helpLong:'Keep this as observable conditions. It is your pre-commitment filter against entering just because price reached a level.'},
  {id:'candidate.invalidationConditions',group:'Candidate',label:'Abandon if',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'What would invalidate the candidate thesis before or around entry.',helpExample:'Price accepts above the zone and holds there; the original rejection thesis is no longer valid.',helpLong:'Invalidation is not the same as a stop distance. It describes when the market thesis itself is no longer valid.'},

  {id:'decision.type',group:'Decision',label:'Decision',defaultRequirement:'OPTIONAL',systemLocked:true,requirementManaged:false,
    helpShort:'What you actually decided when the candidate became actionable.',helpExample:'NO_TRADE if the level was reached but required confirmation never appeared.',optionHelp:{TRADE:'You decided to enter and will record execution separately.',NO_TRADE:'You deliberately chose not to trade.',MISSED:'A valid opportunity may have existed, but you did not execute it.'}},
  {id:'decision.reason',group:'Decision',label:'Decision reason',defaultRequirement:'CONDITIONAL',systemLocked:true,conditionalText:'Required for No-trade and Missed',
    helpShort:'Why you did not trade or why the opportunity was missed.',helpExample:'NO_TRADE because confirmation was missing; MISSED because you noticed the setup too late.'},
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

  {id:'review.decisionQuality',group:'Review',label:'Decision quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Your post-trade grade for the decision itself, independent of P&L.',helpExample:'A losing trade can still receive A if the decision was correct and disciplined.',optionHelp:{A:'Strong process.',B:'Mostly sound with a minor issue.',C:'Material decision weakness.',INVALID:'Cannot be validly graded.',UNCLEAR:'Insufficient clarity.'}},
  {id:'review.executionQuality',group:'Review',label:'Execution quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'How well you executed the intended entry and order mechanics.',helpExample:'NEEDS IMPROVEMENT if you chased the entry even though the idea itself was valid.',optionHelp:{GOOD:'Execution matched the intended plan well.',ACCEPTABLE:'Usable execution with a small imperfection.',NEEDS_IMPROVEMENT:'A meaningful execution error occurred.',UNCLEAR:'Not enough information to judge.'}},
  {id:'review.managementQuality',group:'Review',label:'Management quality',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'How well you managed the open trade after entry.',helpExample:'NEEDS IMPROVEMENT if you widened the stop or exited early without evidence.',optionHelp:{GOOD:'Management followed the intended process well.',ACCEPTABLE:'Mostly sound with a minor issue.',NEEDS_IMPROVEMENT:'A meaningful management mistake occurred.',UNCLEAR:'Not enough information to judge.'}},

  {id:'psychology.emotionAffected',group:'Psychology',label:'Did emotion affect the trade?',defaultRequirement:'OPTIONAL',systemLocked:false,
    helpShort:'Only mark Yes when emotion materially changed entry, management or exit.',helpExample:'Yes if FOMO made you chase; No if you felt nervous but still followed the plan.'},
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

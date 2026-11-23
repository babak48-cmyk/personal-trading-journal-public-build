/** Display-only interpretation of a stored ISO-8601 Decision event time.
 * The original timestamp is immutable; conversion cannot repair a historical
 * wall-clock anomaly and must never overwrite stored occurred_at values.
 */
export function decisionTimestampDisplay(raw:string,locale='en-AU',timeZone?:string):{
  raw:string;utc:string;local:string;valid:boolean;
}{
  // Reject ambiguous legacy timestamps without a timezone rather than
  // silently assuming the user's current timezone.
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)){
    return {raw,utc:'Time zone not verified',local:'Unavailable',valid:false};
  }
  const parsed=new Date(raw);
  if(!Number.isFinite(parsed.getTime())){
    return {raw,utc:'Invalid event time',local:'Unavailable',valid:false};
  }
  const local=new Intl.DateTimeFormat(locale,{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
    timeZoneName:'short',
  }).format(parsed);
  return {raw,utc:parsed.toISOString(),local,valid:true};
}

/** Re-entry must create an independent Decision only for an ACTIVE Session
 * and a still-active Zone belonging to the exact same Session. A closed,
 * archived, cancelled, or missing Zone must not inherit the old Trade's right
 * to open a new attempt. The actual Decision and Trade remain separate events.
 */
export type ReentryContext=Readonly<{
  sessionId:string|null;
  sessionStatus:string|null;
  tradeSessionId:string;
  tradeStatus:string;
  tradeZoneId:string|null|undefined;
  zoneId:string|null|undefined;
  zoneStatus:string|null|undefined;
}>;
export function sameZoneReentryIssue(c:ReentryContext):string|null{
  if(!c.sessionId||c.sessionId!==c.tradeSessionId)
    return 'The previous Trade does not belong to the selected Session.';
  if(c.sessionStatus!=='ACTIVE')
    return 'Re-entry requires an ACTIVE Session. Closed sessions are historical.';
  if(c.tradeStatus!=='CLOSED')
    return 'Only a CLOSED Trade can be used to start a new independent attempt.';
  if(!c.tradeZoneId||!c.zoneId||c.tradeZoneId!==c.zoneId)
    return 'The original Zone is missing from the current Plan.';
  if(!['PLANNED','WATCHING','REACHED','VALID'].includes(c.zoneStatus??''))
    return 'The original Zone is no longer active. Create or revise a valid Zone before a new attempt.';
  return null;
}

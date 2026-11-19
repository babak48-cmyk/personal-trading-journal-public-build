/** Reconcile a Session's canonical state after a confirmed Plan or other
 * persisted lifecycle transition. A successful Plan read alone does not
 * change the SessionSummary in React; stale DRAFT status would misroute
 * Quick required navigation and suppress confirmed-stage workflows.
 *
 * Only accept the row with the exact requested canonical session ID.
 * Never switch the active Session because another async request completed.
 * If a read lacks that row, leave the old UI state intact and let the caller
 * surface the refresh failure instead of fabricating an ACTIVE status.
 */
export function reconcileActiveSession<T extends {session_id:string}>(
  currentlyActive:T|null,
  refreshedSessions:readonly T[],
  requestedSessionId:string,
):T|null {
  if(!currentlyActive||currentlyActive.session_id!==requestedSessionId)return currentlyActive;
  return refreshedSessions.find(session=>session.session_id===requestedSessionId)??currentlyActive;
}

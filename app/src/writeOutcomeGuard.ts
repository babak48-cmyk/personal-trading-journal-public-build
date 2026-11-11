/** A write may have committed even if its response was lost. This retry gate is
 * scoped to the immutable owner ID to avoid blocking unrelated Zones/trades.
 * A successful history read alone is NOT proof that a specific write is absent.
 */
export function hasUncertainWrite(uncertainOwnerId:string|null,activeOwnerId:string|null|undefined):boolean {
  return Boolean(uncertainOwnerId && activeOwnerId && uncertainOwnerId===activeOwnerId);
}

export function canAcknowledgeVerifiedHistory(
  uncertainOwnerId:string|null,
  checkedOwnerId:string|null,
  activeOwnerId:string|null|undefined,
):boolean {
  return hasUncertainWrite(uncertainOwnerId,activeOwnerId) && checkedOwnerId===activeOwnerId;
}

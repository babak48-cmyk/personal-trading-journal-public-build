import {orderFieldIdsWithinSection,isFieldPresented,type FieldPlacement} from './fieldInventory';
import type {RequirementOverrides} from './fieldDefinitions';

/** Quick/Detailed share the same persisted order; required inputs cannot disappear. */
export const EVIDENCE_DETAILS_ORDER=['evidence.direction','evidence.price','evidence.note'] as const;
export function visibleOrderedEvidenceFields(
  quickMode:boolean,
  ranks:Readonly<Record<string,number>>,
  visibility:Readonly<Record<string,boolean>>,
  placements:Readonly<Record<string,FieldPlacement>>,
  requirementOverrides:RequirementOverrides,
):string[]{
  return orderFieldIdsWithinSection(EVIDENCE_DETAILS_ORDER,ranks)
    .filter(id=>isFieldPresented(id,quickMode,visibility,placements,requirementOverrides));
}

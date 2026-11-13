import {orderFieldIdsWithinSection,isFieldPresented,type FieldPlacement} from './fieldInventory';
import {isUserRequired,type RequirementOverrides} from './fieldDefinitions';

/** The existing optional Decision quality default is intentionally Detailed-only.
 * Field Manager can opt it into Quick; a user-required quality always appears.
 * Sorting never changes a Decision record or its stage semantics.
 */
export const DECISION_DETAILS_ORDER=['decision.quality','decision.note'] as const;
export function visibleOrderedDecisionFields(
  quickMode:boolean,
  ranks:Readonly<Record<string,number>>,
  visibility:Readonly<Record<string,boolean>>,
  placements:Readonly<Record<string,FieldPlacement>>,
  overrides:RequirementOverrides,
):string[]{
  return orderFieldIdsWithinSection(DECISION_DETAILS_ORDER,ranks).filter(id=>
    (id!=='decision.quality'||!quickMode||isUserRequired(id,overrides)||placements[id]==='QUICK_AND_DETAILED')
    && isFieldPresented(id,quickMode,visibility,placements,overrides)
  );
}

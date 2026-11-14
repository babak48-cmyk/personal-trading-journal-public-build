import type { CustomFieldDefinition } from './services/localApi';

export const CAPTURABLE_CUSTOM_FIELD_STAGES = ['session','premarket-plan','candidate','zone','trade','post-trade-review','session-review'] as const;
export type CustomFieldOwnerStage = typeof CAPTURABLE_CUSTOM_FIELD_STAGES[number];
export function canCaptureCustomFieldStage(stage:string):stage is CustomFieldOwnerStage {
  return (CAPTURABLE_CUSTOM_FIELD_STAGES as readonly string[]).includes(stage);
}
export type CustomFieldInputKind = 'typed'|'select';

const TYPED = new Set(['TEXT','NUMBER','DATE','BOOLEAN']);
const SELECT = new Set(['SINGLE_SELECT','MULTI_SELECT']);

/** Keep each canonical owner stage separate; hidden/inactive definitions retain history. */
export function eligibleCustomFields(
  definitions:readonly CustomFieldDefinition[],
  ownerStage:CustomFieldOwnerStage,
  kind:CustomFieldInputKind,
):CustomFieldDefinition[] {
  const allowed=kind==='typed'?TYPED:SELECT;
  return definitions.filter(field=>field.active&&field.stage===ownerStage&&allowed.has(field.field_type))
    .sort((a,b)=>a.display_order-b.display_order||a.field_id.localeCompare(b.field_id));
}

export function customFieldFocusId(stage:CustomFieldOwnerStage,ownerId:string,fieldId:string):string{
  // Stable, injective DOM-only focus target. Owner and field IDs may each
  // contain '-' (or other punctuation): simple concatenation would collide,
  // e.g. owner='a-b',field='c' versus owner='a',field='b-c'.
  // Preserve the stage prefix used by Quick's lifecycle router; length-prefix
  // each component without changing persisted SQLite owner/field IDs.
  return 'custom-required-'+stage+'-'+ownerId.length+':'+ownerId+'-'+fieldId.length+':'+fieldId;
}

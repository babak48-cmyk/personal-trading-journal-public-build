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


/** Decode only our length-prefixed DOM focus identity, never stored SQLite IDs.
 * Hyphens, colons and non-ASCII characters may appear in either component.
 * Malformed/legacy IDs deliberately return null rather than switch Zone.
 */
export function customFieldFocusOwner(focusId:string):{stage:CustomFieldOwnerStage;ownerId:string;fieldId:string}|null {
  for(const stage of CAPTURABLE_CUSTOM_FIELD_STAGES){
    const prefix='custom-required-'+stage+'-';
    if(!focusId.startsWith(prefix))continue;
    const tail=focusId.slice(prefix.length);
    const ownerLength=tail.match(/^(0|[1-9][0-9]*):/);
    if(!ownerLength)return null;
    const ownerSize=Number(ownerLength[1]);
    if(!Number.isSafeInteger(ownerSize)||ownerSize<1)return null;
    const remainder=tail.slice(ownerLength[0].length);
    const ownerId=remainder.slice(0,ownerSize);
    if(ownerId.length!==ownerSize||remainder[ownerSize]!=='-')return null;
    const fieldPart=remainder.slice(ownerSize+1);
    const fieldLength=fieldPart.match(/^(0|[1-9][0-9]*):/);
    if(!fieldLength)return null;
    const fieldSize=Number(fieldLength[1]);
    if(!Number.isSafeInteger(fieldSize)||fieldSize<1)return null;
    const fieldId=fieldPart.slice(fieldLength[0].length);
    if(fieldId.length!==fieldSize)return null;
    return {stage,ownerId,fieldId};
  }
  return null;
}

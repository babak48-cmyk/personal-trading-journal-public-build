import type { CustomFieldDefinition } from './services/localApi';

export type CustomFieldOwnerStage = 'session'|'zone';
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
  return 'custom-required-'+stage+'-'+ownerId+'-'+fieldId;
}

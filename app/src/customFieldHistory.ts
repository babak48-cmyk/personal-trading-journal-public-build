import type {CustomFieldDefinition,HistoricalCustomSelection,HistoricalCustomTypedValue} from './services/localApi';
import {readOnlyCustomRow} from './customFieldReadOnly';

export type CustomHistoryScope='plan'|'zone'|'trade'|'session-review';
const STAGES:Record<CustomHistoryScope,readonly string[]>={
  plan:['session','premarket-plan'],
  zone:['candidate','zone'],
  trade:['trade','execution','post-trade-review'],
  'session-review':['session-review'],
};
export type CustomHistoryEvent=Readonly<{id:string;recordedAt:string;display:string}>;
export type CustomHistoryGroup=Readonly<{id:string;stage:string;label:string;retired:boolean;events:readonly CustomHistoryEvent[]}>;
export type CustomHistoryApi={
  listCustomFieldDefinitions:()=>Promise<CustomFieldDefinition[]>;
  listCustomFieldSelectionHistory:(stage:string,owner:string,field:string)=>Promise<HistoricalCustomSelection[]>;
  listCustomFieldTypedHistory:(stage:string,owner:string,field:string)=>Promise<HistoricalCustomTypedValue[]>;
};
const typedKinds=new Set(['TEXT','NUMBER','DATE','BOOLEAN']);
const selectKinds=new Set(['SINGLE_SELECT','MULTI_SELECT']);

/** Read all saved answers in the requested canonical owner scope, including retired
 * definitions and legacy execution fields. Never use current option labels, hide a
 * saved event due to a display preference, or read another lifecycle owner.
 * No current field label snapshot is stored; the UI must say so explicitly. */
export async function loadCustomFieldHistory(api:CustomHistoryApi,scope:CustomHistoryScope,owner:string):Promise<CustomHistoryGroup[]>{
  const stages=STAGES[scope];
  const definitions=(await api.listCustomFieldDefinitions())
    .filter(f=>stages.includes(f.stage)&&(typedKinds.has(f.field_type)||selectKinds.has(f.field_type)))
    .sort((a,b)=>stages.indexOf(a.stage)-stages.indexOf(b.stage)||a.display_order-b.display_order||a.field_id.localeCompare(b.field_id));
  const groups:CustomHistoryGroup[]=[];
  for(const f of definitions){
    const selected=selectKinds.has(f.field_type);
    const events:CustomHistoryEvent[]=selected
      ?(await api.listCustomFieldSelectionHistory(f.stage,owner,f.field_id)).map(e=>({
        id:e.event_id,recordedAt:e.recorded_at,display:readOnlyCustomRow(f,null,e)?.display??'Unavailable or inconsistent saved value'
      }))
      :(await api.listCustomFieldTypedHistory(f.stage,owner,f.field_id)).map(e=>({
        id:e.event_id,recordedAt:e.recorded_at,display:readOnlyCustomRow(f,e,null)?.display??'Unavailable or inconsistent saved value'
      }));
    if(events.length)groups.push({id:f.field_id,stage:f.stage,label:f.label,retired:!f.active,events});
  }
  return groups;
}

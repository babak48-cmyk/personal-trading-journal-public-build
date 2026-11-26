import {describe,expect,it,vi} from 'vitest';
import {loadCustomFieldHistory,type CustomHistoryApi} from './customFieldHistory';
import type {CustomFieldDefinition,HistoricalCustomTypedValue} from './services/localApi';
const field=(field_id:string,stage:string,field_type:string,active=true):CustomFieldDefinition=>({
  field_id,stage,field_type,label:'Current '+field_id,active,required:false,display_order:0,help_text:''
});
const typed=(value:Partial<HistoricalCustomTypedValue>):HistoricalCustomTypedValue=>({
  event_id:'event',recorded_at:'2026-11-27T01:00:00Z',value_type:'NUMBER',
  number_value:null,text_value:null,boolean_value:null,date_value:null,...value
});
describe('read-only custom event inspection',()=>{
  it('reads only the correct owner stages including retired and legacy definitions, retaining zero, false and original option labels',async()=>{
    const api:CustomHistoryApi={
      listCustomFieldDefinitions:async()=>[field('n','trade','NUMBER'),field('b','execution','BOOLEAN',false),field('s','post-trade-review','SINGLE_SELECT',false),field('other','session','TEXT')],
      listCustomFieldTypedHistory:vi.fn(async (_stage:string,_owner:string,id:string)=>id==='n'?[typed({number_value:0})]:[typed({value_type:'BOOLEAN',boolean_value:false})]),
      listCustomFieldSelectionHistory:vi.fn(async()=>[{event_id:'sel',recorded_at:'2026-11-26',options:[{option_id:'o',label_at_selection:'Old label',ordinal:0}]}])
    };
    const groups=await loadCustomFieldHistory(api,'trade','trade-1');
    expect(groups.map(g=>[g.stage,g.retired,g.events[0].display])).toEqual([
      ['trade',false,'0'],['execution',true,'No'],['post-trade-review',true,'Old label']
    ]);
    expect(api.listCustomFieldTypedHistory).toHaveBeenCalledTimes(2);
    expect(api.listCustomFieldTypedHistory).toHaveBeenCalledWith('execution','trade-1','b');
    expect(api.listCustomFieldSelectionHistory).toHaveBeenCalledWith('post-trade-review','trade-1','s');
  });
  it('keeps Zone stages separate, omits fields with no events, and never substitutes current text for an inconsistent event',async()=>{
    const api:CustomHistoryApi={
      listCustomFieldDefinitions:async()=>[field('c','candidate','TEXT'),field('z','zone','NUMBER'),field('unrelated','premarket-plan','TEXT')],
      listCustomFieldTypedHistory:vi.fn(async (stage:string)=>stage==='candidate'?[typed({value_type:'TEXT',text_value:'Original text'}),typed({value_type:'BOOLEAN',boolean_value:false})]:[]),
      listCustomFieldSelectionHistory:vi.fn(async()=>[])
    };
    const groups=await loadCustomFieldHistory(api,'zone','zone-1');
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map(e=>e.display)).toEqual(['Original text','Unavailable or inconsistent saved value']);
    expect(api.listCustomFieldTypedHistory).toHaveBeenCalledWith('zone','zone-1','z');
    expect(api.listCustomFieldTypedHistory).toHaveBeenCalledTimes(2);
  });
  it('fails explicitly when a history read fails, instead of claiming that no history exists',async()=>{
    const api:CustomHistoryApi={
      listCustomFieldDefinitions:async()=>[field('d','session-review','DATE')],
      listCustomFieldTypedHistory:async()=>{throw Error('database unavailable');},
      listCustomFieldSelectionHistory:async()=>[]
    };
    await expect(loadCustomFieldHistory(api,'session-review','review-1')).rejects.toThrow('database unavailable');
  });
});

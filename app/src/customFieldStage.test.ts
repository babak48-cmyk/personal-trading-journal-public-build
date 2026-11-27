import { describe, expect, it } from 'vitest';
import { CAPTURABLE_CUSTOM_FIELD_STAGES,canCaptureCustomFieldStage,customFieldFocusId,eligibleCustomFields,orderCustomFieldEntries,showSessionCustomFieldsOnPage } from './customFieldStage';
import type { CustomFieldDefinition } from './services/localApi';

const entry=(field_id:string,stage:string,field_type:string,display_order:number,active=true):CustomFieldDefinition=>({
  field_id,stage,field_type,display_order,active,label:field_id,help_text:'',required:false,
});

describe('canonical owner-stage custom-field capture',()=>{
  it('only offers creation in stages with end-to-end value editors and real owner IDs',()=>{
    expect(CAPTURABLE_CUSTOM_FIELD_STAGES).toEqual(['session','premarket-plan','candidate','zone','trade','post-trade-review','session-review']);
    for(const stage of CAPTURABLE_CUSTOM_FIELD_STAGES)expect(canCaptureCustomFieldStage(stage)).toBe(true);
    for(const stage of ['execution','evidence','decision'])
      expect(canCaptureCustomFieldStage(stage)).toBe(false);
  });
  const fields=[
    entry('s-text','session','TEXT',2),
    entry('p-text','premarket-plan','TEXT',1),
    entry('p-select','premarket-plan','MULTI_SELECT',0),
    entry('z-choice','zone','SINGLE_SELECT',0),
    entry('z-number','zone','NUMBER',2),
    entry('z-text','zone','TEXT',1),
    entry('z-retired','zone','DATE',3,false),
    entry('different','candidate','TEXT',0),
    entry('trade-detail','trade','NUMBER',0),
    entry('review-comment','post-trade-review','TEXT',0),
    entry('review-select','post-trade-review','SINGLE_SELECT',1),
    entry('session-review-note','session-review','TEXT',0),
    entry('session-review-select','session-review','SINGLE_SELECT',1),
  ];
  it('uses only active fields for the exact canonical owner and input kind',()=>{
    expect(eligibleCustomFields(fields,'zone','typed').map(f=>f.field_id)).toEqual(['z-text','z-number']);
    expect(eligibleCustomFields(fields,'candidate','typed').map(f=>f.field_id)).toEqual(['different']);
    expect(eligibleCustomFields(fields,'trade','typed').map(f=>f.field_id)).toEqual(['trade-detail']);
    expect(eligibleCustomFields(fields,'zone','select').map(f=>f.field_id)).toEqual(['z-choice']);
    expect(eligibleCustomFields(fields,'session','typed').map(f=>f.field_id)).toEqual(['s-text']);
    expect(eligibleCustomFields(fields,'premarket-plan','typed').map(f=>f.field_id)).toEqual(['p-text']);
    expect(eligibleCustomFields(fields,'premarket-plan','select').map(f=>f.field_id)).toEqual(['p-select']);
    expect(eligibleCustomFields(fields,'post-trade-review','typed').map(f=>f.field_id)).toEqual(['review-comment']);
    expect(eligibleCustomFields(fields,'post-trade-review','select').map(f=>f.field_id)).toEqual(['review-select']);
    expect(eligibleCustomFields(fields,'session-review','typed').map(f=>f.field_id)).toEqual(['session-review-note']);
    expect(eligibleCustomFields(fields,'session-review','select').map(f=>f.field_id)).toEqual(['session-review-select']);
  });
  it('uses the shared catalog order across selection and typed fields',()=>{
    const catalog=[
      entry('note','zone','TEXT',0),
      entry('choice','zone','SINGLE_SELECT',1),
      entry('size','zone','NUMBER',2),
      entry('retired','zone','MULTI_SELECT',0,false),
      entry('elsewhere','trade','TEXT',0),
    ];
    const present=()=>orderCustomFieldEntries([
      ...eligibleCustomFields(catalog,'zone','select'),
      ...eligibleCustomFields(catalog,'zone','typed'),
    ].map(field=>({field}))).map(({field})=>field.field_id);
    expect(present()).toEqual(['note','choice','size']);
    catalog[0].display_order=1;
    catalog[1].display_order=0;
    expect(present()).toEqual(['choice','note','size']);
  });
  it.each(CAPTURABLE_CUSTOM_FIELD_STAGES)('%s cannot conflate hyphenated owner and field identifiers',(stage)=>{
    const first=customFieldFocusId(stage,'a-b','c');
    const second=customFieldFocusId(stage,'a','b-c');
    expect(first).not.toBe(second);
    expect(customFieldFocusId(stage,'a-b','c')).toBe(first);
    expect(first.startsWith('custom-required-'+stage+'-')).toBe(true);
  });
  it('retains identity in DOM focus targets even for empty or unicode boundary components',()=>{
    expect(customFieldFocusId('zone','é','a-b')).not.toBe(customFieldFocusId('zone','é-a','b'));
    expect(customFieldFocusId('zone','','a-b')).not.toBe(customFieldFocusId('zone','a','-b'));
  });
  it('gives separate Zone records separate focus targets even for one field definition',()=>{
    expect(customFieldFocusId('zone','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-B','field-X'));
    expect(customFieldFocusId('session','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-A','field-X'));
    expect(customFieldFocusId('session','same-owner','field-X')).not.toBe(customFieldFocusId('premarket-plan','same-owner','field-X'));
    expect(customFieldFocusId('post-trade-review','trade-A','field-X')).not.toBe(customFieldFocusId('post-trade-review','trade-B','field-X'));
    expect(customFieldFocusId('post-trade-review','same-owner','field-X')).not.toBe(customFieldFocusId('zone','same-owner','field-X'));
    expect(customFieldFocusId('session-review','review-A','field-X')).not.toBe(customFieldFocusId('session','review-A','field-X'));
  });
});

describe('stage-specific Quick display with shared persistent Session custom values',()=>{
  it('shows Session custom inputs in Draft and confirmed Plan only while Quick',()=>{
    for(const page of ['PLAN','EVIDENCE','DECISION','EXECUTION','REVIEW']){
      expect(showSessionCustomFieldsOnPage(true,false,page)).toBe(true);
      expect(showSessionCustomFieldsOnPage(true,true,page)).toBe(page==='PLAN');
      expect(showSessionCustomFieldsOnPage(false,true,page)).toBe(true);
    }
  });
  it('never changes owner identity or stored values when only presentation changes',()=>{
    const stage='session',ownerId='s-ES-2026-11-20',fieldId='readiness';
    const target=customFieldFocusId(stage,ownerId,fieldId);
    expect(target).toBe(customFieldFocusId(stage,ownerId,fieldId));
    expect(showSessionCustomFieldsOnPage(true,true,'EXECUTION')).toBe(false);
    expect(showSessionCustomFieldsOnPage(true,true,'PLAN')).toBe(true);
  });
});

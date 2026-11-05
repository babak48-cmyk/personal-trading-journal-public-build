import { describe, expect, it } from 'vitest';
import { customFieldFocusId,eligibleCustomFields } from './customFieldStage';
import type { CustomFieldDefinition } from './services/localApi';

const entry=(field_id:string,stage:string,field_type:string,display_order:number,active=true):CustomFieldDefinition=>({
  field_id,stage,field_type,display_order,active,label:field_id,help_text:'',required:false,
});

describe('canonical owner-stage custom-field capture',()=>{
  const fields=[
    entry('s-text','session','TEXT',2),
    entry('z-choice','zone','SINGLE_SELECT',0),
    entry('z-number','zone','NUMBER',2),
    entry('z-text','zone','TEXT',1),
    entry('z-retired','zone','DATE',3,false),
    entry('different','candidate','TEXT',0),
  ];
  it('uses only active fields for the exact canonical owner and input kind',()=>{
    expect(eligibleCustomFields(fields,'zone','typed').map(f=>f.field_id)).toEqual(['z-text','z-number']);
    expect(eligibleCustomFields(fields,'zone','select').map(f=>f.field_id)).toEqual(['z-choice']);
    expect(eligibleCustomFields(fields,'session','typed').map(f=>f.field_id)).toEqual(['s-text']);
  });
  it('gives separate Zone records separate focus targets even for one field definition',()=>{
    expect(customFieldFocusId('zone','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-B','field-X'));
    expect(customFieldFocusId('session','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-A','field-X'));
  });
});

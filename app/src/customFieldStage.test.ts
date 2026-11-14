import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPTURABLE_CUSTOM_FIELD_STAGES,canCaptureCustomFieldStage,customFieldFocusId,eligibleCustomFields } from './customFieldStage';
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
  it('gives separate Zone records separate focus targets even for one field definition',()=>{
    expect(customFieldFocusId('zone','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-B','field-X'));
    expect(customFieldFocusId('session','zone-A','field-X')).not.toBe(customFieldFocusId('zone','zone-A','field-X'));
    expect(customFieldFocusId('session','same-owner','field-X')).not.toBe(customFieldFocusId('premarket-plan','same-owner','field-X'));
    expect(customFieldFocusId('post-trade-review','trade-A','field-X')).not.toBe(customFieldFocusId('post-trade-review','trade-B','field-X'));
    expect(customFieldFocusId('post-trade-review','same-owner','field-X')).not.toBe(customFieldFocusId('zone','same-owner','field-X'));
    expect(customFieldFocusId('session-review','review-A','field-X')).not.toBe(customFieldFocusId('session','review-A','field-X'));
  });
});

describe('Owner identity isolation across every mounted custom field editor',()=>{
  it('keys both Select and Typed editors by the canonical persisted owner, never Quick/Detailed mode',()=>{
    // A Session switch can otherwise render the previous owner's draft for
    // one React commit before useEffect clears and reloads the editor.
    const source=readFileSync(new URL('./App.tsx',import.meta.url),'utf8');
    const tags=[...source.matchAll(/<Owner(?:CustomSelections|TypedCustomFields)\s+([^>]*?)\/>/g)];
    expect(tags).toHaveLength(14); // Two editors for each of seven capturable stages.
    const stages=new Map<string,number>();
    for(const [,props] of tags){
      const owner=props.match(/\bownerId=\{([^}]+)\}/)?.[1];
      const stage=props.match(/\bownerStage="([^"]+)"/)?.[1];
      const key=props.match(/\bkey=\{([^}]+)\}/)?.[1];
      expect(owner).toBeTruthy();
      expect(stage).toBeTruthy();
      expect(key).toBeTruthy();
      expect(key).toContain(owner);
      expect(key).not.toContain('quickMode');
      stages.set(stage!, (stages.get(stage!)??0)+1);
    }
    expect([...stages.keys()].sort()).toEqual([...CAPTURABLE_CUSTOM_FIELD_STAGES].sort());
    expect([...stages.values()]).toEqual(Array(7).fill(2));
  });
  it('keeps one owner ID distinct across Stage and another owner with same field ID',()=>{
    const ownerA=customFieldFocusId('session','session-A','required-field');
    const ownerB=customFieldFocusId('session','session-B','required-field');
    const premarketA=customFieldFocusId('premarket-plan','session-A','required-field');
    expect(new Set([ownerA,ownerB,premarketA]).size).toBe(3);
  });
});

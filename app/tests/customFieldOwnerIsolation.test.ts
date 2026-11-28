import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPTURABLE_CUSTOM_FIELD_STAGES,customFieldFocusId } from '../src/customFieldStage';

describe('Owner identity isolation across every mounted custom field editor',()=>{
  it('keys the shared Select and Typed editor by the canonical persisted owner, never Quick/Detailed mode',()=>{
    // A Session switch can otherwise render the previous owner's draft for
    // one React commit before useEffect clears and reloads the editor.
    const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
    const tags=[...source.matchAll(/<OwnerCustomFields\s+([^>]*?)\/>/g)];
    expect(tags).toHaveLength(CAPTURABLE_CUSTOM_FIELD_STAGES.length);
    const stages=new Map<string,number>();
    for(const [,props] of tags){
      const owner=props.match(/\bownerId=\{([^}]+)\}/)?.[1];
      const stage=props.match(/\bownerStage="([^"]+)"/)?.[1];
      const key=props.match(/\bkey=\{([^}]+)\}/)?.[1];
      expect(owner).toBeTruthy();
      expect(stage).toBeTruthy();
      expect(key).toBeTruthy();
      expect(key).toContain(owner);
      expect(key).toContain('customCatalogRevision');
      expect(key).not.toContain('quickMode');
      stages.set(stage!, (stages.get(stage!)??0)+1);
    }
    expect([...stages.keys()].sort()).toEqual([...CAPTURABLE_CUSTOM_FIELD_STAGES].sort());
    expect([...stages.values()]).toEqual(CAPTURABLE_CUSTOM_FIELD_STAGES.map(()=>1));
  });
  it('keeps one owner ID distinct across Stage and another owner with same field ID',()=>{
    const ownerA=customFieldFocusId('session','session-A','required-field');
    const ownerB=customFieldFocusId('session','session-B','required-field');
    const premarketA=customFieldFocusId('premarket-plan','session-A','required-field');
    expect(new Set([ownerA,ownerB,premarketA]).size).toBe(3);
  });
});

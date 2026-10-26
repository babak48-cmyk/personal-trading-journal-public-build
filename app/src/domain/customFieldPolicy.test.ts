import {describe,it,expect} from 'vitest';
import {captureSelectSnapshot,historicSelectionLabels,validateCustomFieldDefinition,type CustomFieldDefinition} from './customFieldPolicy';
const sample:CustomFieldDefinition={
  id:'trade_context',type:'SINGLE_SELECT',stage:'post-trade-review',label:'Context',
  required:false,active:true,options:[
    {id:'trending',label:'Trending',active:true,order:0},
    {id:'ranging',label:'Ranging',active:true,order:1},
  ]
};
describe('Gate 3 typed option safety',()=>{
  it('accepts a valid typed select definition',()=>expect(validateCustomFieldDefinition(sample)).toEqual([]));
  it('rejects duplicate stable IDs and malformed labels',()=>{
    expect(validateCustomFieldDefinition({...sample,options:[sample.options[0],sample.options[0]]})).toContain('invalid or duplicate option id');
    expect(validateCustomFieldDefinition({...sample,label:'  '})).toContain('invalid field label');
  });
  it('rejects options for non-select field types',()=>{
    expect(validateCustomFieldDefinition({...sample,type:'NUMBER'})).toContain('non-select field has options');
  });
  it('captures option name at selection time, unchanged after rename/deactivation',()=>{
    const snapshots=captureSelectSnapshot(sample,['trending']);
    const revised={...sample,options:[{...sample.options[0],label:'Directional',active:false},sample.options[1]]};
    expect(historicSelectionLabels(snapshots)).toEqual(['Trending']);
    expect(()=>captureSelectSnapshot(revised,['trending'])).toThrow('unknown or inactive option');
  });
  it('rejects unknown, duplicate and excess selections',()=>{
    expect(()=>captureSelectSnapshot(sample,['missing'])).toThrow();
    expect(()=>captureSelectSnapshot(sample,['trending','ranging'])).toThrow();
    expect(()=>captureSelectSnapshot({...sample,type:'MULTI_SELECT'},['trending','trending'])).toThrow();
  });
});

import {describe,it,expect} from 'vitest';
import {CustomAdminValidationError} from './customAdminValidation';
import {assertSelectCanBecomeRequired,optionBearingFieldIds} from './customSelectRequirement';

describe('custom select lifecycle: definition -> options -> Required',()=>{
  it('permits an optional select definition with no choices',()=>{
    expect(()=>assertSelectCanBecomeRequired('SINGLE_SELECT',false,[])).not.toThrow();
    expect(()=>assertSelectCanBecomeRequired('MULTI_SELECT',false,[])).not.toThrow();
  });
  it('prevents enabling Required without an active, persisted choice',()=>{
    expect(()=>assertSelectCanBecomeRequired('SINGLE_SELECT',true,[])).toThrow(CustomAdminValidationError);
    expect(()=>assertSelectCanBecomeRequired('MULTI_SELECT',true,[{active:false}])).toThrow(CustomAdminValidationError);
    expect(()=>assertSelectCanBecomeRequired('SINGLE_SELECT',true,[{active:false},{active:true}])).not.toThrow();
  });
  it('does not impose select-option rules on typed custom values or when removing Required',()=>{
    expect(()=>assertSelectCanBecomeRequired('TEXT',true,[])).not.toThrow();
    expect(()=>assertSelectCanBecomeRequired('NUMBER',true,[])).not.toThrow();
    expect(()=>assertSelectCanBecomeRequired('SINGLE_SELECT',false,[])).not.toThrow();
  });
  it('refreshes option dictionaries for all select definitions, not only previously opened fields',()=>{
    expect(optionBearingFieldIds([
      {field_id:'a',field_type:'TEXT'},
      {field_id:'b',field_type:'SINGLE_SELECT'},
      {field_id:'c',field_type:'MULTI_SELECT'},
      {field_id:'d',field_type:'NUMBER'},
    ])).toEqual(['b','c']);
  });
});

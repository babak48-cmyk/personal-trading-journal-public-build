import {describe,it,expect} from 'vitest';
import {CustomAdminValidationError} from './customAdminValidation';
import {assertSelectCanBecomeRequired,assertCanDeactivateSelectOption,isSavedCustomFieldLabel,optionBearingFieldIds,validateNewCustomOptionInput} from './customSelectRequirement';

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
  it('protects the last active option in Required selects before write IPC',()=>{
    const old=[{option_id:'first',active:true},{option_id:'old',active:false}];
    expect(()=>assertCanDeactivateSelectOption(true,'first',old)).toThrow(CustomAdminValidationError);
    expect(()=>assertCanDeactivateSelectOption(false,'first',old)).not.toThrow();
    expect(()=>assertCanDeactivateSelectOption(true,'first',[...old,{option_id:'second',active:true}])).not.toThrow();
  });
  it('recognizes the saved native-trimmed field label without a false uncertain-write lock',()=>{
    expect(isSavedCustomFieldLabel(' Session Focus TEST  ','Session Focus TEST')).toBe(true);
    expect(isSavedCustomFieldLabel('Session Focus TEST','Different Field')).toBe(false);
  });
  it('prevalidates option label, UTF-8 byte length and order before native write',()=>{
    const id='b4e12dd7-59e2-43a5-9915-cc020ed02a19';
    expect(()=>validateNewCustomOptionInput(id,id,'  Focus  ',0)).not.toThrow();
    expect(()=>validateNewCustomOptionInput(id,id,' ',0)).toThrow(CustomAdminValidationError);
    expect(()=>validateNewCustomOptionInput(id,id,'م'.repeat(121),0)).toThrow(CustomAdminValidationError);
    expect(()=>validateNewCustomOptionInput(id,id,'Line\nBreak',0)).toThrow(CustomAdminValidationError);
    expect(()=>validateNewCustomOptionInput(id,id,'Focus',-1)).toThrow(CustomAdminValidationError);
  });
  it('verifies native-trimmed option labels, not the original whitespace',()=>{
    expect(isSavedCustomFieldLabel('  Focus  ','Focus')).toBe(true);
    expect(isSavedCustomFieldLabel('Focus','Other')).toBe(false);
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

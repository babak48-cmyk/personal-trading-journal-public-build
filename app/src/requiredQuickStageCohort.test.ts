import {describe,expect,it} from 'vitest';
import {quickValidationRoute,requiredQuickZoneOwner} from './quickValidationRoute';
import {customFieldFocusId} from './customFieldStage';
import {missingRequiredCustomValues,type CustomValueReader} from './customFieldRequired';
import type {CustomFieldDefinition,CustomTypedValue,CustomSelection} from './services/localApi';
import {reviewCompletionIssues,type ReviewCompletionInput} from './reviewCompletion';
import {zoneRequiredIssues} from './zoneRequired';
import {evidenceRequiredIssues} from './evidenceValidation';
import {isFieldPresented} from './fieldInventory';
import type {CandidateDraftInput} from './services/localApi';

const review:ReviewCompletionInput={
  decisionQuality:'A',executionQuality:'GOOD',managementQuality:'GOOD',
  exitReason:'TARGET',exitNote:'',reviewNote:'',ruleNote:'',
  ruleViolationReported:null,violatedRuleIds:[],emotionAffected:true,
  psychologyState:'',psychologyStage:'',psychologyIntensity:null,
};
const priceMissingZone={
  label:'Test Zone',sources:[],required_conditions:[],invalidation_conditions:[],
  price_mode:'RANGE',price_from:null,price_to:null,
} as unknown as CandidateDraftInput;

describe('Cross-stage Quick required/conditional navigation contract',()=>{
  it('routes the same missing observation to Evidence and requires an explicit direction',()=>{
    const issues=evidenceRequiredIssues({'evidence.direction':true,'evidence.note':true},6000,'','');
    expect(issues.map(x=>x.id)).toEqual(['evidence.direction','evidence.note']);
    expect(issues.map(x=>quickValidationRoute(x.id,false,true).notebookPage)).toEqual(['EVIDENCE','EVIDENCE']);
    expect(isFieldPresented('evidence.direction',true,{'evidence.direction':false},{'evidence.direction':'DETAILED_ONLY'}, {'evidence.direction':true})).toBe(true);
  });
  it('routes conditional psychology requirements to Execution only when emotion affected the trade',()=>{
    const yes=reviewCompletionIssues(true,{},review);
    expect(yes.map(x=>x.id)).toEqual(['psychology.state','psychology.stage']);
    expect(yes.every(x=>quickValidationRoute(x.id,false,true).notebookPage==='EXECUTION')).toBe(true);
    expect(reviewCompletionIssues(true,{}, {...review,emotionAffected:false})).toEqual([]);
    expect(reviewCompletionIssues(false,{}, review)).toEqual([]);
  });
  it('keeps a configured intensity Required only on applicable emotion=yes Review completion',()=>{
    const overrides={'psychology.intensity':true};
    const missing=reviewCompletionIssues(true,overrides,review);
    expect(missing.some(x=>x.id==='psychology.intensity')).toBe(true);
    expect(reviewCompletionIssues(true,overrides,{...review,emotionAffected:false})).toEqual([]);
    expect(isFieldPresented('psychology.intensity',true,{'psychology.intensity':false},{'psychology.intensity':'DETAILED_ONLY'},overrides)).toBe(true);
  });
  it('routes each missing conditional range bound to its precise draft Zone',()=>{
    const missing=zoneRequiredIssues(priceMissingZone,'candidate-2',{},' (zone 3)');
    expect(missing.map(x=>x.id)).toEqual(['candidate-2.priceFrom','candidate-2.priceTo']);
    for(const issue of missing)
      expect(quickValidationRoute(issue.id,true,false)).toMatchObject({draftStep:2,draftZonePage:2});
  });
  it('routes required Decision notes to Decision and required Session Review to Review',()=>{
    expect(quickValidationRoute('decision.note',false,true).notebookPage).toBe('DECISION');
    expect(quickValidationRoute('sessionReview.nextImprovement',false,true).notebookPage).toBe('REVIEW');
    expect(isFieldPresented('decision.note',true,{'decision.note':false},{'decision.note':'DETAILED_ONLY'}, {'decision.note':true})).toBe(true);
  });
});

describe('Package A multi-Zone required ownership and Quick focus',()=>{
  const zones=['zone-A','zone-B'];
  const definitions:CustomFieldDefinition[]=[
    {field_id:'candidate-context',stage:'candidate',field_type:'TEXT',label:'Candidate context',
     required:true,active:true,help_text:'',display_order:0},
    {field_id:'zone-provenance',stage:'zone',field_type:'SINGLE_SELECT',label:'Level provenance',
     required:true,active:true,help_text:'',display_order:1},
  ];
  const typed:CustomTypedValue={event_id:'context-A',value_type:'TEXT',text_value:'Earlier planned rejection',
    number_value:null,boolean_value:null,date_value:null};
  const provenance:CustomSelection={event_id:'source-A',
    options:[{option_id:'prior-high',label_at_selection:'Prior day high (historical label)',ordinal:0}]};
  const reads:string[]=[];
  const reader:CustomValueReader={
    listCustomFieldDefinitions:async()=>definitions,
    currentCustomFieldTypedValue:async(stage,owner,field)=>{
      reads.push([stage,owner,field].join(':'));
      return stage==='candidate'&&owner==='zone-A'?typed:null;
    },
    currentCustomFieldSelection:async(stage,owner,field)=>{
      reads.push([stage,owner,field].join(':'));
      return stage==='zone'&&owner==='zone-A'?provenance:null;
    },
  };
  it('does not let complete Zone A satisfy required Candidate/Zone answers for Zone B',async()=>{
    expect(await missingRequiredCustomValues(reader,'candidate','zone-A')).toEqual([]);
    expect(await missingRequiredCustomValues(reader,'zone','zone-A')).toEqual([]);
    const missingCandidate=await missingRequiredCustomValues(reader,'candidate','zone-B');
    const missingZone=await missingRequiredCustomValues(reader,'zone','zone-B');
    expect(missingCandidate.map(x=>x.fieldId)).toEqual(['candidate-context']);
    expect(missingZone.map(x=>x.fieldId)).toEqual(['zone-provenance']);
    const ids=[
      ...missingCandidate.map(x=>customFieldFocusId('candidate','zone-B',x.fieldId)),
      ...missingZone.map(x=>customFieldFocusId('zone','zone-B',x.fieldId)),
    ];
    expect(ids).toHaveLength(2);
    for(const id of ids){
      expect(quickValidationRoute(id,false,true).notebookPage).toBe('PLAN');
      expect(requiredQuickZoneOwner(id,zones)).toBe('zone-B');
    }
    expect(requiredQuickZoneOwner(ids[0],['zone-A'])).toBeNull();
    expect(reads).toEqual(expect.arrayContaining([
      'candidate:zone-A:candidate-context','zone:zone-A:zone-provenance',
      'candidate:zone-B:candidate-context','zone:zone-B:zone-provenance',
    ]));
    expect(provenance.options[0].label_at_selection).toBe('Prior day high (historical label)');
  });
  it('keeps custom field owner routing away from unconfirmed draft/Execution stages',()=>{
    const id=customFieldFocusId('zone','zone-B','zone-provenance');
    expect(quickValidationRoute(id,true,false).notebookPage).toBeNull();
    expect(requiredQuickZoneOwner(id,[])).toBeNull();
    expect(quickValidationRoute(id,false,true).notebookPage).toBe('PLAN');
    expect(quickValidationRoute('decision.reason',false,true).notebookPage).toBe('DECISION');
    expect(quickValidationRoute('evidence.direction',false,true).notebookPage).toBe('EVIDENCE');
  });
});

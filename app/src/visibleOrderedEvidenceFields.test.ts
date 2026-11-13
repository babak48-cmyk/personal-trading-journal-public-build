import {describe,expect,it} from 'vitest';
import {EVIDENCE_DETAILS_ORDER,visibleOrderedEvidenceFields} from './visibleOrderedEvidenceFields';
import {evidenceRequiredIssues} from './evidenceValidation';

describe('Evidence stage Field Manager ordering and Quick/Detailed parity',()=>{
  it('covers direction, price and note exactly once and keeps existing default order',()=>{
    expect(EVIDENCE_DETAILS_ORDER).toEqual(['evidence.direction','evidence.price','evidence.note']);
    expect(visibleOrderedEvidenceFields(true,{}, {}, {}, {})).toEqual(EVIDENCE_DETAILS_ORDER);
    expect(visibleOrderedEvidenceFields(false,{}, {}, {}, {})).toEqual(EVIDENCE_DETAILS_ORDER);
  });
  it('applies a persisted three-field permutation to both modes',()=>{
    const ranks={'evidence.note':0,'evidence.direction':1,'evidence.price':2};
    const expected=['evidence.note','evidence.direction','evidence.price'];
    expect(visibleOrderedEvidenceFields(true,ranks,{}, {}, {})).toEqual(expected);
    expect(visibleOrderedEvidenceFields(false,ranks,{}, {}, {})).toEqual(expected);
  });
  it('removes optional hidden and Detailed-only fields without leaving blank Quick grid slots',()=>{
    const ranks={'evidence.note':0,'evidence.price':1,'evidence.direction':2};
    const visibility={'evidence.price':false};
    const placements={'evidence.note':'DETAILED_ONLY' as const};
    expect(visibleOrderedEvidenceFields(true,ranks,visibility,placements,{})).toEqual(['evidence.direction']);
    expect(visibleOrderedEvidenceFields(false,ranks,visibility,placements,{})).toEqual(['evidence.note','evidence.direction']);
  });
  it('never hides or moves a user-required Evidence input out of Quick or Detailed',()=>{
    const ranks={'evidence.note':0,'evidence.price':1,'evidence.direction':2};
    const visibility={'evidence.price':false,'evidence.direction':false,'evidence.note':false};
    const placements={'evidence.price':'DETAILED_ONLY' as const,'evidence.note':'DETAILED_ONLY' as const,'evidence.direction':'DETAILED_ONLY' as const};
    const overrides={'evidence.direction':true,'evidence.price':true,'evidence.note':true};
    const expected=['evidence.note','evidence.price','evidence.direction'];
    expect(visibleOrderedEvidenceFields(true,ranks,visibility,placements,overrides)).toEqual(expected);
    expect(visibleOrderedEvidenceFields(false,ranks,visibility,placements,overrides)).toEqual(expected);
    expect(evidenceRequiredIssues(overrides,null,'','')).toEqual([
      {id:'evidence.direction',label:'Observed direction'},
      {id:'evidence.price',label:'Observed price'},
      {id:'evidence.note',label:'Evidence note'},
    ]);
  });
  it('does not invent a direction selection from the Neutral persistence fallback',()=>{
    expect(evidenceRequiredIssues({'evidence.direction':true},6123.5,'Observed sweep','')).toContainEqual({id:'evidence.direction',label:'Observed direction'});
    expect(evidenceRequiredIssues({'evidence.direction':true},6123.5,'Observed sweep','NEUTRAL')).toEqual([]);
  });
});

import {describe,it,expect} from 'vitest';
import {FIELD_MANAGER_ORDER_SECTIONS,managerOrderPosition,fieldManagerCapabilities,SESSION_REVIEW_REFLECTION_ORDER} from './fieldManagerOrdering';
import {FIELD_CONTROL_INVENTORY,orderFieldIdsWithinSection} from './fieldInventory';

describe('Package A connected Field Manager ordering',()=>{
 it('exposes only already connected same-section inputs, without duplicates',()=>{
  const ids=FIELD_MANAGER_ORDER_SECTIONS.flatMap(x=>[...x.ids]);
  expect(new Set(ids).size).toBe(ids.length);
  for(const id of ids){
   expect(FIELD_CONTROL_INVENTORY.some(x=>x.id===id)).toBe(true);
   expect(managerOrderPosition(id,{})).not.toBeNull();
  }
  expect(managerOrderPosition('trade.entryPrice',{})).toBeNull();
  expect(managerOrderPosition('candidate.trendRelationship',{})).toBeNull();
 });
 it('reports persisted reordered positions for a filtered inventory row',()=>{
  const before=managerOrderPosition('plan.alternativeScenario',{});
  expect(before?.position).toBe(1);
  const ranks={'plan.alternativeScenario':0,'plan.mainScenario':1};
  const after=managerOrderPosition('plan.alternativeScenario',ranks);
  expect(after?.position).toBe(0);
  expect(after?.ids).toEqual(['plan.alternativeScenario','plan.mainScenario']);
 });
 it('reordering within one section never changes IDs or unrelated stages',()=>{
  const row=managerOrderPosition('evidence.note',{'evidence.note':0});
  expect(row?.position).toBe(0);
  expect(new Set(row!.ids)).toEqual(new Set(['evidence.direction','evidence.price','evidence.note']));
  expect(orderFieldIdsWithinSection(['decision.quality','decision.note'],{})).toEqual(['decision.quality','decision.note']);
 });
});


describe('Field Manager actual capability filters',()=>{
 it('includes protected Setup criteria in editable settings without unlocking requirements or visibility',()=>{
  expect(fieldManagerCapabilities('setup.marketContext')).toMatchObject({editable:true,protected:true,requirement:false,visibility:false,placement:false,text:true,order:true});
 });
 it('distinguishes visibility-only controls from Required/Optional controls',()=>{
  expect(fieldManagerCapabilities('review.mistakes')).toMatchObject({editable:true,requirement:false,visibility:true,placement:true,text:true});
  expect(fieldManagerCapabilities('psychology.emotionAffected')).toMatchObject({editable:true,requirement:true,visibility:false,placement:false});
 });
 it('keeps execution identities protected and unknown IDs noneditable',()=>{
  expect(fieldManagerCapabilities('trade.entryPrice')).toMatchObject({protected:true,editable:false,requirement:false,visibility:false,order:false,text:false});
  expect(fieldManagerCapabilities('unknown.field').editable).toBe(false);
 });
});

describe('Session review overall assessment ordering',()=>{
 it('preserves default and existing two-field saved order',()=>{
  expect(orderFieldIdsWithinSection(SESSION_REVIEW_REFLECTION_ORDER,{})).toEqual(['sessionReview.wentWell','sessionReview.nextImprovement','sessionReview.overall']);
  expect(orderFieldIdsWithinSection(SESSION_REVIEW_REFLECTION_ORDER,{'sessionReview.nextImprovement':0,'sessionReview.wentWell':1})).toEqual(['sessionReview.nextImprovement','sessionReview.wentWell','sessionReview.overall']);
 });
 it('allows overall assessment to move to first position without changing field identity',()=>{
  const ranks={'sessionReview.overall':0,'sessionReview.wentWell':1,'sessionReview.nextImprovement':2};
  expect(managerOrderPosition('sessionReview.overall',ranks)?.position).toBe(0);
  expect(orderFieldIdsWithinSection(SESSION_REVIEW_REFLECTION_ORDER,ranks)).toEqual(['sessionReview.overall','sessionReview.wentWell','sessionReview.nextImprovement']);
  expect(fieldManagerCapabilities('sessionReview.overall').order).toBe(true);
 });
});

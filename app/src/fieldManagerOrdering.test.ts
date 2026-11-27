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
  expect(managerOrderPosition('trade.entryPrice',{})?.position).toBe(0);
  expect(managerOrderPosition('candidate.trendRelationship',{})?.position).toBe(2);
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
  for(const id of ['session.date','session.instrument','session.environment','candidate.intent','candidate.priceMode','plan.bias','candidate.price','decision.type','decision.reason','trade.entryPrice','trade.stopPrice','trade.quantity']){
   expect(fieldManagerCapabilities(id),id).toMatchObject({protected:true,editable:true,requirement:false,visibility:false,placement:false,text:true,order:['session.date','session.instrument','session.environment','trade.entryPrice','trade.stopPrice','trade.quantity','candidate.intent'].includes(id)});
  }
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


describe('Protected psychology and trend presentation preferences',()=>{
 it.each(['psychology.state','psychology.stage','candidate.trendRelationship'])('preserves protected semantics for %s while permitting supported presentation',id=>{
  expect(fieldManagerCapabilities(id)).toMatchObject({editable:true,text:true,protected:true,requirement:false,visibility:false,placement:false,order:true});
 });
 it('retains required-only semantics of the emotion gate while enabling text',()=>{
  expect(fieldManagerCapabilities('psychology.emotionAffected')).toMatchObject({editable:true,text:true,requirement:true,visibility:false,placement:false,order:false});
 });
});

it('keeps session and entry ordering within their own sections',()=>{
 expect(managerOrderPosition('session.instrument',{'session.instrument':0,'session.date':1})?.ids).toEqual(['session.instrument','session.date','session.environment']);
 expect(managerOrderPosition('trade.plannedTarget',{'trade.plannedTarget':0})?.ids).toEqual(['trade.plannedTarget','trade.entryPrice','trade.stopPrice','trade.quantity']);
});

it('preserves zone price geometry and setup priority semantics while ordering only independent controls',()=>{
 expect(managerOrderPosition('candidate.label',{'candidate.intent':0})?.ids).toEqual(['candidate.intent','candidate.label','candidate.trendRelationship']);
 expect(managerOrderPosition('candidate.priceMode',{})).toBeNull();
 expect(managerOrderPosition('candidate.price',{})).toBeNull();
 expect(managerOrderPosition('setup.evidenceRole',{'setup.evidenceRole':0})?.ids).toEqual(['setup.evidenceRole','setup.evidenceName','setup.evidenceHelp']);
 for(const id of ['candidate.intent','candidate.trendRelationship','setup.evidenceName','setup.evidenceRole']) expect(fieldManagerCapabilities(id)).toMatchObject({order:true,visibility:false,placement:false,requirement:false});
});

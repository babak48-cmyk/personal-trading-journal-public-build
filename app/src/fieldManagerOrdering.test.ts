import {describe,it,expect} from 'vitest';
import {FIELD_MANAGER_ORDER_SECTIONS,managerOrderPosition} from './fieldManagerOrdering';
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

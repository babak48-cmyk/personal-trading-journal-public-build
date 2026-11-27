import {describe,it,expect} from 'vitest';
import {readVerifiedTradeReview,reviewReadbackOwnerIssue} from './reviewReadbackIntegrity';
import type {TradeReview,TradeRuleCheck} from './services/localApi';
const review=(trade_id:string):TradeReview=>({review_id:'r-'+trade_id,trade_id,status:'COMPLETED',mistake_type_ids:[]});
const rules=(trade_id:string):TradeRuleCheck=>({trade_rule_check_id:'c-'+trade_id,trade_id,any_violation:false,violated_rule_version_ids:[],checked_at:'2026-11-21T00:00:00Z'});
describe('read-back of exact trade Review / rule adherence',()=>{
 it('permits no Review and no Rule Check as missing, not secretly completed',()=>{
  expect(reviewReadbackOwnerIssue('A','A',null,null)).toBeNull();
 });
 it('permits a matching persisted completed Review and Rule Check',()=>{
  expect(reviewReadbackOwnerIssue('A','A',review('A'),rules('A'))).toBeNull();
 });
 it('rejects trade detail from a different trade',()=>{
  expect(reviewReadbackOwnerIssue('A','B',null,null)).not.toBeNull();
 });
 it('rejects stale completed review from earlier selection',()=>{
  expect(reviewReadbackOwnerIssue('A','A',review('B'),null)).toContain('Review');
 });
 it('rejects a rule check from another trade instead of inheriting its violation status',()=>{
  expect(reviewReadbackOwnerIssue('A','A',null,rules('B'))).toContain('rule check');
 });
});

describe('paired Review and rule check loading after an exit',()=>{
 it('requests both records using the exact closed Trade ID',async()=>{
  const api={
   getTradeReview:async (id:string)=>review(id),
   getTradeRuleCheck:async (id:string)=>rules(id),
  };
  await expect(readVerifiedTradeReview(api,'closed','closed'))
    .resolves.toEqual({review:review('closed'),ruleCheck:rules('closed')});
 });
 it('does not let a valid Review mask a stale or unavailable rule check',async()=>{
  const getTradeReview=async (id:string)=>review(id);
  await expect(readVerifiedTradeReview({getTradeReview,getTradeRuleCheck:async()=>rules('B')},'A','A'))
    .rejects.toThrow('different Trade');
  await expect(readVerifiedTradeReview({getTradeReview,getTradeRuleCheck:async()=>{throw Error('offline');}},'A','A'))
    .rejects.toThrow('offline');
 });
});

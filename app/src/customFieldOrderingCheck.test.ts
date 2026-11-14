import {describe,it,expect} from 'vitest';
import {verifiedAdjacentMove} from './customFieldOrderingCheck';

describe('Field and option ordering proof',()=>{
  it('verifies an adjacent move but no unrelated swap',()=>{
    expect(verifiedAdjacentMove(['A','B','C'],['B','A','C'],'A',1)).toBe(true);
    expect(verifiedAdjacentMove(['A','B','C'],['A','C','B'],'C',-1)).toBe(true);
    expect(verifiedAdjacentMove(['A','B','C'],['C','B','A'],'A',1)).toBe(false);
    expect(verifiedAdjacentMove(['A','B','C'],['A','B','C'],'A',1)).toBe(false);
  });
  it('rejects out-of-range targets, missing IDs and non-unique or deleted rows',()=>{
    expect(verifiedAdjacentMove(['A','B'],['B','A'],'A',-1)).toBe(false);
    expect(verifiedAdjacentMove(['A','B'],['B','A'],'B',1)).toBe(false);
    expect(verifiedAdjacentMove(['A','B'],['B','A'],'C',1)).toBe(false);
    expect(verifiedAdjacentMove(['A','B'],['B'],'A',1)).toBe(false);
    expect(verifiedAdjacentMove(['A','A'],['A','A'],'A',1)).toBe(false);
  });
});

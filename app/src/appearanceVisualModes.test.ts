import {describe,it,expect} from 'vitest';
import {DEFAULT_APPEARANCE,normalizeAppearance} from './appearance';

describe('Package B visual presentation compatibility',()=>{
 it('keeps legacy appearance as unchanged Basic',()=>{
   expect(DEFAULT_APPEARANCE.visualMode).toBe('BASIC');
   expect(normalizeAppearance({theme:'DARK',accent:'TEAL'})).toMatchObject({visualMode:'BASIC',theme:'DARK',accent:'TEAL'});
 });
 it('accepts the three independent modes without disturbing other settings',()=>{
   for(const visualMode of ['BASIC','HIGHLIGHT','COLORFUL'] as const){
     expect(normalizeAppearance({...DEFAULT_APPEARANCE,visualMode,theme:'LIGHT'})).toMatchObject({visualMode,theme:'LIGHT'});
   }
 });
 it('never executes or trusts unknown stored appearance modes',()=>{
   expect(normalizeAppearance({...DEFAULT_APPEARANCE,visualMode:'BROKEN'}).visualMode).toBe('BASIC');
 });
});
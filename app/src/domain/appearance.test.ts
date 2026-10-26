import {describe,expect,it} from 'vitest';
import {DEFAULT_APPEARANCE,normalizeAppearance,resolvedTheme} from '../appearance';

describe('appearance preferences',()=>{
  it('fails closed to defaults for invalid values',()=>{
    expect(normalizeAppearance({theme:'NOPE',fontSize:'HUGE'})).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid values',()=>{
    expect(normalizeAppearance({theme:'DARK',fontSize:'LARGE',fontFamily:'SERIF',backgroundTone:'WARM'})).toEqual({
      theme:'DARK',fontSize:'LARGE',fontFamily:'SERIF',backgroundTone:'WARM'
    });
  });

  it('resolves system theme from OS preference',()=>{
    expect(resolvedTheme('SYSTEM',true)).toBe('DARK');
    expect(resolvedTheme('SYSTEM',false)).toBe('LIGHT');
    expect(resolvedTheme('LIGHT',true)).toBe('LIGHT');
  });
});

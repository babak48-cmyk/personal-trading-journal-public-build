import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, normalizeAppearance, resolvedTheme } from './appearance';

describe('user-selected appearance accent', () => {
  it('preserves the original default for existing stored settings without an accent', () => {
    expect(normalizeAppearance({theme:'DARK',fontSize:'LARGE',fontFamily:'SEGOE',backgroundTone:'WARM'}))
      .toEqual({theme:'DARK',fontSize:'LARGE',fontFamily:'SEGOE',backgroundTone:'WARM',accent:'DEFAULT'});
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });

  it('permits every supported accent while retaining the other appearance preferences', () => {
    for (const accent of ['DEFAULT','BLUE','TEAL','PURPLE','AMBER']) {
      expect(normalizeAppearance({...DEFAULT_APPEARANCE,accent}).accent).toBe(accent);
    }
  });

  it('rejects invalid or non-string accent values without altering unrelated choices', () => {
    for (const accent of ['arbitrary','#fff','RED',null,42]) {
      expect(normalizeAppearance({...DEFAULT_APPEARANCE,theme:'DARK',accent}).accent).toBe('DEFAULT');
      expect(normalizeAppearance({...DEFAULT_APPEARANCE,theme:'DARK',accent}).theme).toBe('DARK');
    }
  });

  it('keeps system Light/Dark resolution independent of palette choice', () => {
    expect(resolvedTheme('SYSTEM',false)).toBe('LIGHT');
    expect(resolvedTheme('SYSTEM',true)).toBe('DARK');
  });
});

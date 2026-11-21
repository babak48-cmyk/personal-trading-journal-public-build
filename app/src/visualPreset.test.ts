import {describe,expect,it} from 'vitest';
import {DEFAULT_APPEARANCE, normalizeAppearance, resolvedTheme} from './appearance';

describe('three optional visual display templates',()=>{
  const legacy={theme:'DARK',fontSize:'LARGE',fontFamily:'SEGOE',backgroundTone:'WARM',accent:'TEAL'};
  it('retains exact original display for persisted settings created before templates',()=>{
    expect(normalizeAppearance(legacy)).toEqual({...legacy,visualPreset:'CURRENT'});
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });
  it('preserves the users Warm, font size/family, accent and theme across all presets',()=>{
    for(const visualPreset of ['CURRENT','PROFESSIONAL','QUICK_HIGHLIGHT']){
      const normalized=normalizeAppearance({...legacy,visualPreset});
      expect(normalized).toEqual({...legacy,visualPreset});
      expect(resolvedTheme(normalized.theme,false)).toBe('DARK');
    }
  });
  it('rejects an unsupported visual preset without resetting existing preferences',()=>{
    expect(normalizeAppearance({...legacy,visualPreset:'SOMETHING_NEW'})).toEqual({...legacy,visualPreset:'CURRENT'});
    expect(normalizeAppearance({...legacy,visualPreset:null})).toEqual({...legacy,visualPreset:'CURRENT'});
  });
  it('does not force font size, theme, or tone when switching from a highlighted template',()=>{
    const highlighted=normalizeAppearance({...legacy,visualPreset:'QUICK_HIGHLIGHT'});
    const switched=normalizeAppearance({...highlighted,visualPreset:'PROFESSIONAL'});
    expect(switched).toEqual({...legacy,visualPreset:'PROFESSIONAL'});
    expect(normalizeAppearance({...switched,visualPreset:'CURRENT'})).toEqual({...legacy,visualPreset:'CURRENT'});
  });
});

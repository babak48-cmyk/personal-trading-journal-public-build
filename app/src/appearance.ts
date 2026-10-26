export type AppearanceTheme='SYSTEM'|'LIGHT'|'DARK';
export type AppearanceFontSize='COMPACT'|'DEFAULT'|'LARGE';
export type AppearanceFontFamily='SYSTEM'|'SEGOE'|'SERIF';
export type AppearanceBackgroundTone='NEUTRAL'|'COOL'|'WARM';

export type AppearancePreferences={
  theme:AppearanceTheme;
  fontSize:AppearanceFontSize;
  fontFamily:AppearanceFontFamily;
  backgroundTone:AppearanceBackgroundTone;
};

export const DEFAULT_APPEARANCE:AppearancePreferences={
  theme:'SYSTEM',
  fontSize:'DEFAULT',
  fontFamily:'SYSTEM',
  backgroundTone:'NEUTRAL',
};

const allowed={
  theme:new Set<AppearanceTheme>(['SYSTEM','LIGHT','DARK']),
  fontSize:new Set<AppearanceFontSize>(['COMPACT','DEFAULT','LARGE']),
  fontFamily:new Set<AppearanceFontFamily>(['SYSTEM','SEGOE','SERIF']),
  backgroundTone:new Set<AppearanceBackgroundTone>(['NEUTRAL','COOL','WARM']),
};

export function normalizeAppearance(value:unknown):AppearancePreferences{
  if(!value||typeof value!=='object')return {...DEFAULT_APPEARANCE};
  const v=value as Partial<AppearancePreferences>;
  return {
    theme:allowed.theme.has(v.theme as AppearanceTheme)?v.theme as AppearanceTheme:DEFAULT_APPEARANCE.theme,
    fontSize:allowed.fontSize.has(v.fontSize as AppearanceFontSize)?v.fontSize as AppearanceFontSize:DEFAULT_APPEARANCE.fontSize,
    fontFamily:allowed.fontFamily.has(v.fontFamily as AppearanceFontFamily)?v.fontFamily as AppearanceFontFamily:DEFAULT_APPEARANCE.fontFamily,
    backgroundTone:allowed.backgroundTone.has(v.backgroundTone as AppearanceBackgroundTone)?v.backgroundTone as AppearanceBackgroundTone:DEFAULT_APPEARANCE.backgroundTone,
  };
}

export function resolvedTheme(theme:AppearanceTheme,prefersDark:boolean):'LIGHT'|'DARK'{
  return theme==='SYSTEM'?(prefersDark?'DARK':'LIGHT'):theme;
}

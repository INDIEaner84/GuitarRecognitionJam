/**
 * Theme hook: persists the selected design prototype and applies it to <html>.
 */
import { useEffect, useState } from 'react';
import { DEFAULT_THEME, ThemeDef, THEMES, themeById } from './themes';

const KEY = 'harmonic-scout.theme.v1';

export const useTheme = () => {
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem(KEY) ?? DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-cyber-theme', themeId);
    try {
      localStorage.setItem(KEY, themeId);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const current: ThemeDef = themeById(themeId);
  const all = THEMES;

  return { themeId, current, all, setThemeId };
};

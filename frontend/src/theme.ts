/** Синхронизация темы с localStorage — один раз при старте приложения (не при каждом заходе в Профиль). */
export const THEME_LIGHT_KEY = 'chrona-theme-light';
export const LEGACY_THEME_KEY = 'chrona-theme';

export function bootstrapTheme(): void {
  if (typeof window === 'undefined') return;
  let light = localStorage.getItem(THEME_LIGHT_KEY) === '1';
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy !== null) {
    localStorage.removeItem(LEGACY_THEME_KEY);
    light = legacy !== 'dark';
    localStorage.setItem(THEME_LIGHT_KEY, light ? '1' : '0');
  }
  document.documentElement.classList.toggle('theme-light', light);
}

export function isLightModeFromDom(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
}

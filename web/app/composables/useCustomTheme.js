import { useTheme } from 'vuetify';
import * as CookieConstant from '~/constants/CookieConstant';

const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

export function useCustomTheme() {
  const localTheme = useCookie(CookieConstant.Base.THEME, { secure: true, sameSite: true, maxAge: 86400 * 365 });
  const theme = useTheme();
  const currentTheme = computed(() => theme.global.name.value);
  const isDarkTheme = computed(() => theme.global.name.value === THEME_DARK);
  const themeColors = computed(() => theme.global.current.value.colors);

  const initTheme = () => {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDarkScheme.addEventListener('change', (event) => {
      setTheme(event.matches ? THEME_DARK : THEME_LIGHT);
    });
    setTheme(localTheme.value || (prefersDarkScheme.matches ? THEME_DARK : THEME_LIGHT));
  };

  const setTheme = (v) => {
    document.querySelector('html').setAttribute('data-theme', v);
    localTheme.value = v;
    theme.change(v);
  };

  const toggleTheme = () => {
    setTheme(isDarkTheme.value ? THEME_LIGHT : THEME_DARK);
  };

  return {
    currentTheme,
    initTheme,
    isDarkTheme,
    localTheme,
    setTheme,
    themeColors,
    toggleTheme,
  };
}

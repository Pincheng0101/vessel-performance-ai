import * as CookieConstant from '~/constants/CookieConstant';

export function useCustomLocale() {
  const localLocale = useCookie(CookieConstant.Base.LOCALE, { secure: true, sameSite: true, maxAge: 86400 * 365 });
  const i18n = useI18n();
  const dayjs = useDayjs();

  const initLocale = () => {
    setLocale(localLocale.value || navigator.language);
  };

  const setLocale = (v) => {
    if (!i18n.locales.value.some(locale => locale.code === v)) return;
    localLocale.value = v;
    i18n.setLocale(v);
    dayjs.locale(v);
  };

  return {
    localLocale,
    initLocale,
  };
}

import { CookieConstant } from '~/constants';

export function useCustomLocale() {
  const localLocale = useCookie(CookieConstant.Base.LOCALE, { secure: true, sameSite: true, maxAge: 86400 * 365 });
  const i18n = useI18n();
  const { $validator } = useNuxtApp();
  const dayjs = useDayjs();

  const initLocale = () => {
    setLocale(localLocale.value || navigator.language);
  };

  const setLocale = (v) => {
    if (!i18n.locales.value.some(locale => locale.code === v)) return;
    localLocale.value = v;
    i18n.setLocale(v);
    $validator.setLocale(v);
    dayjs.locale(v);
  };

  const translateObj = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => {
        if (item && typeof item === 'object') return translateObj(item);
        return item;
      });
    }
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      let newKey = key;
      let newValue = value;
      if (key.endsWith('I18n')) {
        newKey = key.slice(0, -4);
        if (typeof value === 'string') newValue = i18n.t(value);
        if (value && typeof value === 'object') newValue = translateObj(value);
      }
      if (!key.endsWith('I18n') && value && typeof value === 'object') {
        newValue = translateObj(value);
      }
      result[newKey] = newValue;
    });
    return result;
  };

  return {
    localLocale,
    initLocale,
    setLocale,
    translateObj,
  };
}

import en from '~~/i18n/locales/en';
import zhTW from '~~/i18n/locales/zh-TW';

export default defineI18nConfig(() => {
  return {
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en,
      'zh-TW': zhTW,
    },
  };
});

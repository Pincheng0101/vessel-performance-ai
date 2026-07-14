// UI locales for the language switcher. The display name is the language's own
// endonym (English, 正體中文) and is intentionally not translated, so it reads
// the same regardless of the active locale. nuxt.config i18n.locales only holds
// the codes, so this is the single source for "code + display name".
const Base = Object.freeze({
  EN: { value: 'en', text: 'English' },
  ZH_TW: { value: 'zh-TW', text: '正體中文' },
});

export {
  Base,
};

const PLACEHOLDER_OBJECT_NAME = '.keep';

const Type = Object.freeze({
  STORAGE: {
    title: 'Storage',
    value: 'storage',
    iconPath: '/images/icons/storage.svg',
    i18nSubtitle: '__subtitleStorageTypeStorage',
  },
});

const INVALID_SYMBOLS = Object.freeze([
  '/',
  ':',
]);

export {
  INVALID_SYMBOLS,
  PLACEHOLDER_OBJECT_NAME,
  Type,
};

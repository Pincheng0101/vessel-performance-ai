const Type = Object.freeze({
  CONSECUTIVE: {
    title: 'Consecutive',
    value: 'consecutive',
    iconPath: '/images/icons/consecutive.svg',
    i18nSubtitle: '__subtitleChunkerTypeConsecutive',
  },
  CUMULATIVE: {
    title: 'Cumulative',
    value: 'cumulative',
    iconPath: '/images/icons/cumulative.svg',
    i18nSubtitle: '__subtitleChunkerTypeCumulative',
  },
  FIXED_SIZE: {
    title: 'Fixed Size',
    value: 'fixed_size',
    iconPath: '/images/icons/fixedSize.svg',
    i18nSubtitle: '__subtitleChunkerTypeFixedSize',
  },
  MINIMAL_PARTITION: {
    title: 'Minimal Partition',
    value: 'minimal_partition',
    iconPath: '/images/icons/minimalPartition.svg',
    i18nSubtitle: '__subtitleChunkerTypeMinimalPartition',
  },
});

const DefaultChunker = Object.freeze({
  ID: 'chunker-default',
});

const DefaultParams = Object.freeze({
  CHUNK_OVERLAP: {
    default: 0,
    min: 0,
    max: 2048,
    step: 1,
  },
  CHUNK_SIZE: {
    default: 200,
    min: 1,
    max: 2048,
    step: 1,
  },
  CHUNK_SEPARATORS: {
    default: [strUtils.escapeControlChars('\n')],
  },
  MAX_CHUNK_SIZE: {
    default: 500,
    min: 1,
    max: 2048,
    step: 1,
  },
  MIN_CHUNK_SIZE: {
    default: 100,
    min: 1,
    max: 2048,
    step: 1,
  },
});

export {
  DefaultChunker,
  DefaultParams,
  Type,
};

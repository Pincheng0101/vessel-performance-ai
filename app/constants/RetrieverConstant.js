const Type = Object.freeze({
  EMBEDDING: {
    title: 'Embedding',
    value: 'embedding',
    iconPath: '/images/icons/embedding.svg',
    i18nSubtitle: '__subtitleRetrieverTypeEmbedding',
  },
  KEYWORD: {
    title: 'Keyword',
    value: 'keyword',
    iconPath: '/images/icons/keyword.svg',
    i18nSubtitle: '__subtitleRetrieverTypeKeyword',
  },
  HYBRID_SEARCH: {
    title: 'Hybrid Search',
    value: 'hybrid_search',
    iconPath: '/images/icons/hybridSearch.svg',
    i18nSubtitle: '__subtitleRetrieverTypeHybridSearch',
  },
});

const HybridSearchNormalizationTechnique = Object.freeze({
  MIN_MAX: {
    i18nTitle: '__fieldRetrieverHybridSearchNormalizationTechniqueMinMax',
    i18nSubtitle: '__subtitleRetrieverHybridSearchNormalizationTechniqueMinMax',
    value: 'min_max',
  },
  L2: {
    i18nTitle: '__fieldRetrieverHybridSearchNormalizationTechniqueL2',
    i18nSubtitle: '__subtitleRetrieverHybridSearchNormalizationTechniqueL2',
    value: 'l2',
  },
});

const HybridSearchCombinationTechnique = Object.freeze({
  ARITHMETIC_MEAN: {
    i18nTitle: '__fieldRetrieverHybridSearchCombinationTechniqueArithmeticMean',
    i18nSubtitle: '__subtitleRetrieverHybridSearchCombinationTechniqueArithmeticMean',
    value: 'arithmetic_mean',
  },
  GEOMETRIC_MEAN: {
    i18nTitle: '__fieldRetrieverHybridSearchCombinationTechniqueGeometricMean',
    i18nSubtitle: '__subtitleRetrieverHybridSearchCombinationTechniqueGeometricMean',
    value: 'geometric_mean',
  },
  HARMONIC_MEAN: {
    i18nTitle: '__fieldRetrieverHybridSearchCombinationTechniqueHarmonicMean',
    i18nSubtitle: '__subtitleRetrieverHybridSearchCombinationTechniqueHarmonicMean',
    value: 'harmonic_mean',
  },
});

const HybridSearchParams = Object.freeze({
  KEYWORD_WEIGHT: {
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  EMBEDDING_WEIGHT: {
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  NORMALIZATION_TECHNIQUE: {
    default: HybridSearchNormalizationTechnique.MIN_MAX.value,
  },
  COMBINATION_TECHNIQUE: {
    default: HybridSearchCombinationTechnique.ARITHMETIC_MEAN.value,
  },
});

const KeywordQuerySource = Object.freeze({
  QUERY_STRINGS: {
    i18nTitle: '__fieldQuerySourceKeywords',
    value: 'query_strings',
    icon: 'mdi-text-search',
    i18nSubtitle: '__subtitleQuerySourceKeywords',
  },
  SEARCH_QUERY: {
    i18nTitle: '__fieldQuerySourceOpenSearchQuery',
    value: 'search_query',
    iconPath: '/images/icons/opensearch.svg',
    i18nSubtitle: '__subtitleQuerySourceOpenSearchQuery',
  },
});

const DefaultKeywordRetriever = Object.freeze({
  ID: 'retriever-default-keyword',
});

const DefaultEmbeddingRetriever = Object.freeze({
  ID: 'retriever-default-embedding',
});

const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        docs: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
      required: ['docs'],
    },
  },
  RETRIEVER_FILTER_QUERY: {
    default: null,
    jsonSchema: {
      type: [
        'object',
        'array',
      ],
      items: {
        type: 'object',
      },
    },
  },
  RETRIEVER_FIELD_MAPPINGS: {
    retriever_chunk: 'retriever_chunk',
  },
  RETRIEVER_LIMIT: {
    default: 10,
    min: 1,
    max: 1000,
    step: 1,
  },
  RETRIEVER_SEARCH_QUERY: {
    match_all: {},
  },
});

export {
  ActionExecutionParams,
  DefaultEmbeddingRetriever,
  DefaultKeywordRetriever,
  HybridSearchCombinationTechnique,
  HybridSearchNormalizationTechnique,
  HybridSearchParams,
  KeywordQuerySource,
  Type,
};

const Type = Object.freeze({
  EMBEDDING: {
    title: 'Embedding',
    value: 'embedding',
    iconPath: '/images/icons/embedding.svg',
    i18nSubtitle: '__subtitleRankerTypeEmbedding',
  },
  JACCARD_SIMILARITY: {
    title: 'Jaccard Similarity',
    value: 'jaccard_similarity',
    iconPath: '/images/icons/jaccardSimilarity.svg',
    i18nSubtitle: '__subtitleRankerTypeJaccardSimilarity',
  },
  COHERE: {
    title: 'Cohere',
    value: 'cohere',
    fullTitle: 'Cohere',
    iconPath: '/images/icons/cohere.svg',
    i18nSubtitle: '__subtitleRankerTypeCohere',
  },
  AMAZON: {
    title: 'Amazon',
    value: 'amazon',
    fullTitle: 'Amazon',
    iconPath: '/images/icons/amazon.svg',
    i18nSubtitle: '__subtitleRankerTypeAmazon',
  },
});

const DefaultParams = Object.freeze({
  INSTANCE_COUNT: {
    default: 1,
    min: 1,
    max: 10,
    step: 1,
  },
});

const AmazonModel = Object.freeze({
  AMAZON_RERANK_V1: {
    title: 'Amazon Rerank v1',
    value: 'amazon.rerank-v1:0',
  },
});

const CohereModel = Object.freeze({
  COHERE_RERANK_V3_5: {
    title: 'Cohere Rerank v3.5',
    value: 'cohere.rerank-v3-5:0',
  },
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
  RANKER_DOCS: {
    default: [],
    jsonSchema: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
  RANKER_LIMIT: {
    default: 10,
    min: 1,
    max: 1000,
    step: 1,
  },
  RANKER_THRESHOLD: {
    default: 0,
    min: 0,
    max: 1,
    step: 0.01,
  },
  RANKER_MAX_LENGTH: {
    default: 512,
    min: 1,
    max: 8192,
    step: 1,
  },
});

export {
  ActionExecutionParams,
  AmazonModel,
  CohereModel,
  DefaultParams,
  Type,
};

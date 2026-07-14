import * as AwsConstant from './AwsConstant';

const Type = Object.freeze({
  BEDROCK_COHERE: {
    title: 'Amazon Bedrock - Cohere',
    value: 'bedrock.cohere',
    iconPath: '/images/icons/cohere.svg',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohere',
  },
});

const EmbeddingType = Object.freeze({
  DENSE: {
    title: 'Dense',
    value: 'dense',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereEmbeddingTypeDense',
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

const BedrockCohereModel = Object.freeze({
  COHERE_EMBED_MULTILINGUAL_V3: {
    title: 'Cohere Embed V3',
    value: 'cohere.embed-multilingual-v3',
    supportedRegions: [
      AwsConstant.Region.AP_NORTHEAST_1,
      AwsConstant.Region.AP_NORTHEAST_2,
      AwsConstant.Region.AP_NORTHEAST_3,
      AwsConstant.Region.AP_SOUTH_1,
      AwsConstant.Region.AP_SOUTHEAST_1,
      AwsConstant.Region.AP_SOUTHEAST_2,
      AwsConstant.Region.US_EAST_1,
      AwsConstant.Region.US_EAST_2,
      AwsConstant.Region.US_WEST_1,
      AwsConstant.Region.US_WEST_2,
    ],
    maxTokens: {
      default: 512,
      min: 128,
      max: 512,
      step: 1,
    },
    outputDimension: {
      default: 1024,
      options: [1024],
    },
  },
  GLOBAL_COHERE_EMBED_V4: {
    title: 'Global Cohere Embed V4',
    value: 'global.cohere.embed-v4:0',
    supportedRegions: [
      AwsConstant.Region.AP_NORTHEAST_1,
      AwsConstant.Region.AP_NORTHEAST_2,
      AwsConstant.Region.AP_NORTHEAST_3,
      AwsConstant.Region.AP_SOUTH_1,
      AwsConstant.Region.AP_SOUTHEAST_1,
      AwsConstant.Region.AP_SOUTHEAST_2,
      AwsConstant.Region.US_EAST_1,
      AwsConstant.Region.US_EAST_2,
      AwsConstant.Region.US_WEST_1,
      AwsConstant.Region.US_WEST_2,
    ],
    maxTokens: {
      default: 512,
      min: 128,
      max: 128000,
      step: 1,
    },
    outputDimension: {
      default: 1024,
      options: [256, 512, 1024, 1536],
    },
  },
  US_COHERE_EMBED_V4: {
    title: 'US Cohere Embed V4',
    value: 'us.cohere.embed-v4:0',
    supportedRegions: [
      AwsConstant.Region.US_EAST_1,
      AwsConstant.Region.US_EAST_2,
      AwsConstant.Region.US_WEST_1,
      AwsConstant.Region.US_WEST_2,
    ],
    maxTokens: {
      default: 512,
      min: 128,
      max: 128000,
      step: 1,
    },
    outputDimension: {
      default: 1024,
      options: [256, 512, 1024, 1536],
    },
  },
});

const BedrockCohereTruncate = Object.freeze({
  START: {
    i18nTitle: '__fieldEmbeddingModelBedrockCohereTruncateStart',
    value: 'START',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereTruncateStart',
  },
  END: {
    i18nTitle: '__fieldEmbeddingModelBedrockCohereTruncateEnd',
    value: 'END',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereTruncateEnd',
  },
});

const BedrockCohereInputType = Object.freeze({
  SEARCH_QUERY: {
    i18nTitle: '__fieldEmbeddingModelBedrockCohereInputTypeSearchQuery',
    value: 'search_query',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereInputTypeSearchQuery',
  },
  CLASSIFICATION: {
    i18nTitle: '__fieldEmbeddingModelBedrockCohereInputTypeClassification',
    value: 'classification',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereInputTypeClassification',
  },
  CLUSTERING: {
    i18nTitle: '__fieldEmbeddingModelBedrockCohereInputTypeClustering',
    value: 'clustering',
    i18nSubtitle: '__subtitleEmbeddingModelTypeBedrockCohereInputTypeClustering',
  },
});

const Model = Object.freeze({
  ...Object.values(BedrockCohereModel).reduce((acc, model) => ({ ...acc, [model.value]: model }), {}),
});

export {
  BedrockCohereInputType,
  BedrockCohereModel,
  BedrockCohereTruncate,
  DefaultParams,
  EmbeddingType,
  Model,
  Type,
};

const Type = Object.freeze({
  GOOGLE: {
    title: 'Google',
    value: 'google',
    iconPath: '/images/icons/google.svg',
    i18nSubtitle: '__subtitleSearchEngineTypeGoogle',
    i18nValidateAction: '__actionValidateApiKey',
    i18nValidateMessage: '__messageApiKeyValidated',
    i18nValidating: '__actionValidating',
    i18nSecretInputFields: [
      '__fieldApiKey',
    ],
  },
  DUCKDUCKGO: {
    title: 'DuckDuckGo',
    value: 'duckduckgo',
    iconPath: '/images/icons/duckduckgo.svg',
    i18nSubtitle: '__subtitleSearchEngineTypeDuckDuckGo',
  },
  PERPLEXITY: {
    title: 'Perplexity',
    value: 'perplexity',
    iconPath: '/images/icons/perplexity.svg',
    i18nSubtitle: '__subtitleSearchEngineTypePerplexity',
    i18nValidateAction: '__actionValidateApiKey',
    i18nValidateMessage: '__messageApiKeyValidated',
    i18nValidating: '__actionValidating',
    i18nSecretInputFields: [
      '__fieldApiKey',
    ],
  },
  OPENAI: {
    title: 'OpenAI',
    value: 'openai',
    iconPath: '/images/icons/openai.svg',
    i18nSubtitle: '__subtitleSearchEngineTypeOpenAi',
    i18nValidateAction: '__actionValidateApiKey',
    i18nValidateMessage: '__messageApiKeyValidated',
    i18nValidating: '__actionValidating',
    i18nSecretInputFields: [
      '__fieldApiKey',
    ],
  },
});

const DuckDuckGoSafeSearch = Object.freeze({
  MODERATE: {
    i18nTitle: '__titleSearchEngineDuckDuckGoSafeSearchModerate',
    value: 'moderate',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoSafeSearchModerate',
  },
  ON: {
    i18nTitle: '__titleSearchEngineDuckDuckGoSafeSearchOn',
    value: 'on',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoSafeSearchOn',
  },
  OFF: {
    i18nTitle: '__titleSearchEngineDuckDuckGoSafeSearchOff',
    value: 'off',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoSafeSearchOff',
  },
});

const DuckDuckGoTimeLimit = Object.freeze({
  DAY: {
    i18nTitle: '__titleSearchEngineDuckDuckGoTimeLimitDay',
    value: 'd',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoTimeLimitDay',
  },
  WEEK: {
    i18nTitle: '__titleSearchEngineDuckDuckGoTimeLimitWeek',
    value: 'w',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoTimeLimitWeek',
  },
  MONTH: {
    i18nTitle: '__titleSearchEngineDuckDuckGoTimeLimitMonth',
    value: 'm',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoTimeLimitMonth',
  },
  YEAR: {
    i18nTitle: '__titleSearchEngineDuckDuckGoTimeLimitYear',
    value: 'y',
    i18nSubtitle: '__subtitleSearchEngineDuckDuckGoTimeLimitYear',
  },
});

const PerplexityModel = Object.freeze({
  SONAR: {
    title: 'Sonar',
    value: 'sonar',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 131072,
      step: 1,
    },
    temperature: {
      default: 0.2,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
    topP: {
      default: 0.9,
      min: 0,
      max: 1,
      step: 0.1,
    },
    frequencyPenalty: {
      default: 0,
      min: 0,
      max: 2,
      step: 0.1,
    },
    presencePenalty: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
  },
  SONAR_PRO: {
    title: 'Sonar Pro',
    value: 'sonar-pro',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 131072,
      step: 1,
    },
    temperature: {
      default: 0.2,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
    topP: {
      default: 0.9,
      min: 0,
      max: 1,
      step: 0.1,
    },
    frequencyPenalty: {
      default: 0,
      min: 0,
      max: 2,
      step: 0.1,
    },
    presencePenalty: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
  },
});

const PerplexitySearchRecencyFilter = Object.freeze({
  DAY: {
    i18nTitle: '__titleSearchEnginePerplexitySearchRecencyFilterDay',
    value: 'day',
    i18nSubtitle: '__subtitleSearchEnginePerplexitySearchRecencyFilterDay',
  },
  WEEK: {
    i18nTitle: '__titleSearchEnginePerplexitySearchRecencyFilterWeek',
    value: 'week',
    i18nSubtitle: '__subtitleSearchEnginePerplexitySearchRecencyFilterWeek',
  },
  MONTH: {
    i18nTitle: '__titleSearchEnginePerplexitySearchRecencyFilterMonth',
    value: 'month',
    i18nSubtitle: '__subtitleSearchEnginePerplexitySearchRecencyFilterMonth',
  },
  YEAR: {
    i18nTitle: '__titleSearchEnginePerplexitySearchRecencyFilterYear',
    value: 'year',
    i18nSubtitle: '__subtitleSearchEnginePerplexitySearchRecencyFilterYear',
  },
});

const OpenAiWebModel = Object.freeze({
  GPT_4_1: {
    title: 'GPT 4.1',
    value: 'gpt-4.1',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 32768,
      step: 1,
    },
    temperature: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topP: {
      default: 1,
      min: 0,
      max: 1,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
  },
  GPT_4_1_MINI: {
    title: 'GPT-4.1 mini',
    value: 'gpt-4.1-mini',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 32768,
      step: 1,
    },
    temperature: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topP: {
      default: 1,
      min: 0,
      max: 1,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
  },
  GPT_4O: {
    title: 'GPT-4o',
    value: 'gpt-4o',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 16384,
      step: 1,
    },
    temperature: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topP: {
      default: 1,
      min: 0,
      max: 1,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
  },
  GPT_4O_MINI: {
    title: 'GPT-4o mini',
    value: 'gpt-4o-mini',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 16384,
      step: 1,
    },
    temperature: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topP: {
      default: 1,
      min: 0,
      max: 1,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
  },
  O4_MINI: {
    title: 'o4 mini',
    value: 'o4-mini',
    maxTokens: {
      default: 1024,
      min: 128,
      max: 100000,
      step: 1,
    },
    temperature: {
      default: 1,
      min: 0,
      max: 2,
      step: 0.1,
    },
    topP: {
      default: 1,
      min: 0,
      max: 1,
      step: 0.1,
    },
    topK: {
      default: 0,
      min: 0,
      max: 500,
      step: 1,
    },
  },
});

const SearchContextSize = Object.freeze({
  LOW: {
    i18nTitle: '__titleSearchEngineSearchContextSizeLow',
    value: 'low',
    i18nSubtitle: '__subtitleSearchEngineSearchContextSizeLow',
  },
  MEDIUM: {
    i18nTitle: '__titleSearchEngineSearchContextSizeMedium',
    value: 'medium',
    i18nSubtitle: '__subtitleSearchEngineSearchContextSizeMedium',
  },
  HIGH: {
    i18nTitle: '__titleSearchEngineSearchContextSizeHigh',
    value: 'high',
    i18nSubtitle: '__subtitleSearchEngineSearchContextSizeHigh',
  },
});

const GoogleSiteSearchFilter = Object.freeze({
  INCLUDE: {
    i18nTitle: '__titleSearchEngineGoogleSiteSearchFilterInclude',
    value: 'i',
    i18nSubtitle: '__subtitleSearchEngineGoogleSiteSearchFilterInclude',
  },
  EXCLUDE: {
    i18nTitle: '__titleSearchEngineGoogleSiteSearchFilterExclude',
    value: 'e',
    i18nSubtitle: '__subtitleSearchEngineGoogleSiteSearchFilterExclude',
  },
});

const Delimiter = Object.freeze({
  PIPE: '|',
  SPACE: ' ',
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
        output: {
          type: 'string',
        },
        search_results: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
      required: ['search_results'],
    },
  },
  SEARCH_ENGINE_LIMIT: {
    default: 10,
    min: 1,
    max: 100,
    step: 1,
  },
  GOOGLE_COMPACT_MODE: true,
  PERPLEXITY_OUTPUT_TEXT_INCLUDES_CITATION: true,
});

export {
  ActionExecutionParams,
  Delimiter,
  DuckDuckGoSafeSearch,
  DuckDuckGoTimeLimit,
  GoogleSiteSearchFilter,
  OpenAiWebModel,
  PerplexityModel,
  PerplexitySearchRecencyFilter,
  SearchContextSize,
  Type,
};

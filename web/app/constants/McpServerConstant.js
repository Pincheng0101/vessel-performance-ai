import * as IconConstant from './IconConstant';

const Base = Object.freeze({
  TOOL: {
    icon: 'mdi-toolbox',
  },
});

const Type = Object.freeze({
  STREAMABLE_HTTP: {
    i18nTitle: '__titleMcpServerTypeStreamableHttp',
    value: 'streamable_http',
    iconPath: '/images/icons/streamableHttp.svg',
    i18nSubtitle: '__subtitleMcpServerTypeStreamableHttp',
  },
  CUSTOM: {
    i18nTitle: '__titleMcpServerTypeCustom',
    value: 'custom',
    iconPath: '/images/icons/custom.svg',
    i18nSubtitle: '__subtitleMcpServerTypeCustom',
  },
});

const CustomToolType = Object.freeze({
  AGENT: {
    i18nTitle: '__fieldAgent',
    value: 'agent',
    i18nSubtitle: '__subtitleCustomToolTypeAgent',
    icon: IconConstant.Base.AGENT,
  },
  ATHENA: {
    i18nTitle: '__fieldAthena',
    value: 'athena',
    i18nSubtitle: '__subtitleCustomToolTypeAthena',
    iconPath: '/images/icons/athena.svg',
  },
  CODE: {
    i18nTitle: '__fieldCode',
    value: 'code',
    i18nSubtitle: '__subtitleCustomToolTypeCode',
    iconPath: '/images/icons/code.svg',
  },
  HTTP: {
    i18nTitle: '__fieldHttp',
    value: 'http',
    i18nSubtitle: '__subtitleCustomToolTypeHttp',
    iconPath: '/images/icons/api.svg',
  },
  LAMBDA: {
    i18nTitle: '__fieldLambda',
    value: 'lambda',
    i18nSubtitle: '__subtitleCustomToolTypeLambda',
    iconPath: '/images/icons/amazon.svg',
  },
  MYSQL: {
    i18nTitle: '__fieldMySql',
    value: 'mysql',
    i18nSubtitle: '__subtitleCustomToolTypeMySql',
    iconPath: '/images/icons/mysql.svg',
  },
  OPENSEARCH: {
    i18nTitle: '__fieldOpenSearch',
    value: 'opensearch',
    i18nSubtitle: '__subtitleCustomToolTypeOpenSearch',
    iconPath: '/images/icons/opensearch.svg',
  },
  RETRIEVAL: {
    i18nTitle: '__fieldRetrieval',
    value: 'retrieval',
    i18nSubtitle: '__subtitleCustomToolTypeRetrieval',
    icon: IconConstant.Base.RETRIEVAL,
  },
});

const StreamableHttpAuthType = Object.freeze({
  HEADER: {
    i18nTitle: '__fieldMcpServerAuthTypeHeader',
    value: 'header',
  },
  OAUTH: {
    i18nTitle: '__fieldMcpServerAuthTypeOauth',
    value: 'oauth',
  },
});

const DefaultParams = Object.freeze({
  CODE: '# The function must be named "handler".\ndef handler(data):\n  # Replace the code below with your implementation.\n  output = data\n\n  # Ensure that the function returns the result.\n  return output',
});

const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        response: {
          type: 'object',
        },
      },
      required: [],
    },
  },
  INPUT: {},
});

export {
  ActionExecutionParams,
  Base,
  CustomToolType,
  DefaultParams,
  StreamableHttpAuthType,
  Type,
};

import * as ResourceConstant from './ResourceConstant';

const ActionExecutionParams = Object.freeze({
  EXISTING_QUERY_TEMPLATE_VARIABLES: {},
  CUSTOM_QUERY_TEMPLATE_VARIABLES: {
    'content.$': '$.content',
  },
  CUSTOM_QUERY_STRING: '',
});

const QuerySource = Object.freeze({
  CUSTOM_QUERY_STRING: {
    i18nTitle: '__fieldQuerySourceCustomQueryString',
    value: 'custom_query_string',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitleQuerySourceCustomQueryString',
  },
  CUSTOM_QUERY_TEMPLATE: {
    i18nTitle: '__fieldQuerySourceCustomQueryTemplate',
    value: 'custom_query_template',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitleQuerySourceCustomQueryTemplate',
  },
  EXISTING_QUERY_TEMPLATE: {
    i18nTitle: '__fieldQuerySourceExistingQueryTemplate',
    value: 'existing_query_template',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitleQuerySourceExistingQueryTemplate',
  },
});

export {
  ActionExecutionParams,
  QuerySource,
};

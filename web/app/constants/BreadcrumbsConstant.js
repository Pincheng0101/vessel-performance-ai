import * as ResourceConstant from './ResourceConstant';

const PathTranslationMap = Object.freeze({
  ...Object.fromEntries(
    Object.values(ResourceConstant.Type).map(type => [
      type.path,
      {
        key: type.i18nTitle,
        plural: 2,
      },
    ]),
  ),
  'accounts': {
    key: '__titleAccounts',
    plural: 1,
  },
  'api-keys': {
    key: '__fieldApiKey',
    plural: 2,
  },
  'application-api-keys': {
    key: '__fieldApplicationApiKey',
    plural: 2,
  },
  'authentication': {
    key: '__titleAuthentication',
    plural: 1,
  },
  'chat': {
    key: '__actionChat',
    plural: 1,
  },
  'create': {
    key: '__actionCreate',
    plural: 1,
  },
  'cron-jobs': {
    key: '__titleSchedule',
    plural: 2,
  },
  'dataset-items': {
    key: '__fieldDatasetItem',
    plural: 2,
  },
  'demo': {
    key: '__titleDemo',
    plural: 1,
  },
  'edit': {
    key: '__actionEdit',
    plural: 1,
  },
  'evaluate': {
    key: '__titleEvaluate',
    plural: 1,
  },
  'executions': {
    key: '__fieldExecution',
    plural: 2,
  },
  'groups': {
    key: '__fieldGroup',
    plural: 2,
  },
  'organization': {
    key: '__titleOrganization',
    plural: 1,
  },
  'playground': {
    key: '__titlePlayground',
    plural: 1,
  },
  'privacy': {
    key: '__titlePrivacyPolicy',
    plural: 1,
  },
  'quick-start': {
    key: '__titleAgentBuilder',
    plural: 1,
  },
  'resources': {
    key: '__titleResource',
    plural: 2,
  },
  'sync-jobs': {
    key: '__fieldSyncJob',
    plural: 2,
  },
  'usage': {
    key: '__titleUsage',
    plural: 1,
  },
  'user': {
    key: '__fieldUser',
    plural: 1,
  },
  'users': {
    key: '__fieldUser',
    plural: 2,
  },
  'workflow-templates': {
    key: '__titleWorkflowTemplate',
    plural: 2,
  },
});

export {
  PathTranslationMap,
};

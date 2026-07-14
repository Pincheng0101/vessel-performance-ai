const Resource = Object.freeze({
  DELETING: {
    i18nTitle: '__fieldStatusDeleting',
    value: 'DELETING',
  },
  PENDING: {
    i18nTitle: '__fieldStatusPending',
    value: 'PENDING',
  },
  READY: {
    i18nTitle: '__fieldStatusReady',
    value: 'READY',
  },
});

const Runtime = Object.freeze({
  ABORTED: {
    i18nTitle: '__fieldStatusAborted',
    value: 'ABORTED',
    icon: 'mdi-stop-circle-outline',
  },
  ACTIVE: {
    i18nTitle: '__fieldStatusActive',
    value: 'ACTIVE',
    icon: '',
  },
  CANCELED: {
    i18nTitle: '__fieldStatusCanceled',
    value: 'CANCELED',
    icon: 'mdi-cancel',
  },
  DELETING: {
    i18nTitle: '__fieldStatusDeleting',
    value: 'DELETING',
    icon: '',
  },
  INACTIVE: {
    i18nTitle: '__fieldStatusInactive',
    value: 'INACTIVE',
    icon: '',
  },
  FAILED: {
    i18nTitle: '__fieldStatusFailed',
    value: 'FAILED',
    icon: 'mdi-alert-circle-outline',
  },
  NOT_STARTED: {
    i18nTitle: '__fieldStatusNotStarted',
    value: 'NOT_STARTED',
    icon: '',
  },
  PENDING: {
    i18nTitle: '__fieldStatusPending',
    value: 'PENDING',
    icon: '',
  },
  READY: {
    i18nTitle: '__fieldStatusReady',
    value: 'READY',
    icon: '',
  },
  RUNNING: {
    i18nTitle: '__fieldStatusRunning',
    value: 'RUNNING',
    icon: 'mdi-play-circle-outline',
  },
  SUCCEEDED: {
    i18nTitle: '__fieldStatusSucceeded',
    value: 'SUCCEEDED',
    icon: 'mdi-check-circle-outline',
  },
  UPDATING: {
    i18nTitle: '__fieldStatusUpdating',
    value: 'UPDATING',
    icon: '',
  },
  PROCESSED: {
    i18nTitle: '__fieldStatusProcessed',
    value: 'PROCESSED',
    icon: '',
  },
  PROCESSING: {
    i18nTitle: '__fieldStatusProcessing',
    value: 'PROCESSING',
    icon: '',
  },
});

const MarketplaceOnboarding = Object.freeze({
  ACTIVE: {
    value: 'ACTIVE',
  },
  NOT_SUBSCRIBED: {
    value: 'NOT_SUBSCRIBED',
  },
  INSUFFICIENT: {
    value: 'INSUFFICIENT',
  },
});

const StatusCode = Object.freeze({
  NOT_FOUND: 400,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
});

export {
  MarketplaceOnboarding,
  Resource,
  Runtime,
  StatusCode,
};

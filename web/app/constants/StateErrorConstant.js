const GeneralErrorType = Object.freeze({
  STATES_ALL: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesAll',
    value: 'States.ALL',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesAll',
  },
  STATES_TIMEOUT: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesTimeout',
    value: 'States.Timeout',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesTimeout',
  },
  STATES_HEARTBEAT_TIMEOUT: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesHeartbeatTimeout',
    value: 'States.HeartbeatTimeout',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesHeartbeatTimeout',
  },
  STATES_TASK_FAILED: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesTaskFailed',
    value: 'States.TaskFailed',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesTaskFailed',
  },
  STATES_RESULT_PATH_MATCH_FAILURE: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesResultPathMatchFailure',
    value: 'States.ResultPathMatchFailure',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesResultPathMatchFailure',
  },
  STATES_PARAMETER_PATH_FAILURE: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesParameterPathFailure',
    value: 'States.ParameterPathFailure',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesParameterPathFailure',
  },
  STATES_BRANCH_FAILED: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesBranchFailed',
    value: 'States.BranchFailed',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesBranchFailed',
  },
  STATES_NO_CHOICE_MATCHED: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesNoChoiceMatched',
    value: 'States.NoChoiceMatched',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesNoChoiceMatched',
  },
  STATES_INTRINSIC_FAILURE: {
    i18nTitle: '__fieldStatesErrorGeneralErrorTypeStatesIntrinsicFailure',
    value: 'States.IntrinsicFailure',
    i18nSubtitle: '__subtitleStatesErrorGeneralErrorTypeStatesIntrinsicFailure',
  },
});

const LambdaErrorType = Object.freeze({
  LAMBDA_SERVICE_EXCEPTION: {
    i18nTitle: '__fieldStatesErrorLambdaErrorTypeLambdaServiceException',
    value: 'Lambda.ServiceException',
    i18nSubtitle: '__subtitleStatesErrorLambdaErrorTypeLambdaServiceException',
  },
  LAMBDA_AWS_LAMBDA_EXCEPTION: {
    i18nTitle: '__fieldStatesErrorLambdaErrorTypeLambdaAWSLambdaException',
    value: 'Lambda.AWSLambdaException',
    i18nSubtitle: '__subtitleStatesErrorLambdaErrorTypeLambdaAWSLambdaException',
  },
  LAMBDA_SDK_CLIENT_EXCEPTION: {
    i18nTitle: '__fieldStatesErrorLambdaErrorTypeLambdaSdkClientException',
    value: 'Lambda.SdkClientException',
    i18nSubtitle: '__subtitleStatesErrorLambdaErrorTypeLambdaSdkClientException',
  },
  LAMBDA_TOO_MANY_REQUESTS_EXCEPTION: {
    i18nTitle: '__fieldStatesErrorLambdaErrorTypeLambdaTooManyRequestsException',
    value: 'Lambda.TooManyRequestsException',
    i18nSubtitle: '__subtitleStatesErrorLambdaErrorTypeLambdaTooManyRequestsException',
  },
});

const RetryJitterStrategyType = Object.freeze({
  FULL: {
    title: 'Full',
    value: 'FULL',
  },
});

const RetryParams = Object.freeze({
  INTERVAL_SECONDS: {
    default: 1,
    min: 0,
    max: Number.MAX_VALUE,
  },
  MAX_ATTEMPTS: {
    default: 3,
    min: 0,
    max: Number.MAX_VALUE,
  },
  BACKOFF_RATE: {
    default: 2,
    min: 1,
    max: Number.MAX_VALUE,
  },
  MAX_DELAY_SECONDS: {
    default: null,
    min: 0,
    max: 31622401,
  },
});

export {
  GeneralErrorType,
  LambdaErrorType,
  RetryJitterStrategyType,
  RetryParams,
};

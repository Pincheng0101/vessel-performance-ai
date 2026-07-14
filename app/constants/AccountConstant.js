const Base = Object.freeze({
  ADMIN_AUTHENTICATION: {
    i18nTitle: '__titleAuthentication',
    icon: 'mdi-shield-key-outline',
  },
  ADMIN_MANAGED_GROUP: {
    i18nTitle: '__fieldGroup',
    value: 'group',
    module: 'group',
    path: 'groups',
    id: 'groupName',
    listKey: 'groups',
    listMethod: 'adminList',
    getMethod: 'adminGet',
    getEndpoint: '/account/admin-get-group',
    getEndpointId: 'group_name',
    createMethod: 'adminCreate',
    createRequestResourceName: 'group_name',
    icon: 'mdi-account-multiple',
    favoriteFilterField: 'group_name',
  },
  ADMIN_MANAGED_USER: {
    i18nTitle: '__fieldUser',
    value: 'user',
    module: 'user',
    path: 'users',
    id: 'userName',
    listKey: 'users',
    listMethod: 'adminList',
    getMethod: 'adminGet',
    getEndpoint: '/account/admin-get-user',
    getEndpointId: 'username',
    createMethod: 'adminCreate',
    createRequestResourceName: 'username',
    icon: 'mdi-account',
    favoriteFilterField: 'username',
  },
  API_KEY: {
    i18nTitle: '__fieldApiKey',
    value: 'api_key',
    module: 'api_key',
    icon: 'mdi-key',
    favoriteFilterField: 'api_key_id',
  },
  APPLICATION_API_KEY: {
    i18nTitle: '__fieldApplicationApiKey',
    value: 'application_api_key',
    module: 'application_api_key',
    path: 'application-api-keys',
    id: 'applicationApiKeyId',
    icon: 'mdi-key-variant',
    favoriteFilterField: 'application_api_key_id',
  },
  GROUP: {
    i18nTitle: '__fieldGroup',
    value: 'group',
    module: 'group',
    icon: 'mdi-account-multiple',
    favoriteFilterField: 'group_name',
  },
  USER: {
    icon: 'mdi-account-circle',
  },
  TEMPORARY_PASSWORD: {
    i18nTitle: '__fieldTemporaryPassword',
    icon: 'mdi-lock-reset',
  },
  CHANGE_PASSWORD: {
    i18nTitle: '__fieldChangePassword',
    icon: 'mdi-lock-reset',
  },
});

const MfaConfiguration = Object.freeze({
  OFF: {
    i18nTitle: '__fieldMfaModeOff',
    i18nSubtitle: '__fieldMfaModeOffSubtitle',
    value: 'OFF',
    color: 'warning',
  },
  OPTIONAL: {
    i18nTitle: '__fieldMfaModeOptional',
    i18nSubtitle: '__fieldMfaModeOptionalSubtitle',
    value: 'OPTIONAL',
  },
  ON: {
    i18nTitle: '__fieldMfaModeRequired',
    i18nSubtitle: '__fieldMfaModeRequiredSubtitle',
    value: 'ON',
    color: 'success',
  },
});

const MfaType = Object.freeze({
  SOFTWARE_TOKEN_MFA: {
    i18nTitle: '__fieldMfaTotp',
    value: 'SOFTWARE_TOKEN_MFA',
    icon: 'mdi-qrcode-scan',
  },
  WEB_AUTHN: {
    i18nTitle: '__fieldMfaPasskey',
    value: 'WEB_AUTHN',
    icon: 'mdi-fingerprint',
  },
});

const WebAuthnUserVerification = Object.freeze({
  PREFERRED: {
    i18nTitle: '__fieldWebAuthnUvPreferred',
    i18nSubtitle: '__fieldWebAuthnUvPreferredSubtitle',
    value: 'preferred',
  },
  REQUIRED: {
    i18nTitle: '__fieldWebAuthnUvRequired',
    i18nSubtitle: '__fieldWebAuthnUvRequiredSubtitle',
    value: 'required',
    color: 'success',
  },
});

const AccessType = Object.freeze({
  READ: {
    title: 'Read',
    value: 'read',
    i18nAction: '__actionPermissionRead',
  },
  WRITE: {
    title: 'Write',
    value: 'write',
    i18nAction: '__actionPermissionWrite',
  },
});

const AccountType = Object.freeze({
  AGENT_PERMISSION: {
    value: 'agent_permission',
  },
  RESOURCE_PERMISSION: {
    value: 'resource_permission',
  },
  WORKFLOW_PERMISSION: {
    value: 'workflow_permission',
  },
  USER: {
    value: 'user',
  },
  GROUP: {
    value: 'group',
  },
  API_KEY: {
    value: 'api_key',
  },
});

const Group = Object.freeze({
  ADMIN: {
    value: 'admin-group',
  },
});

const UserStatus = Object.freeze({
  UNCONFIRMED: {
    title: 'Unconfirmed',
    value: 'UNCONFIRMED',
  },
  CONFIRMED: {
    title: 'Confirmed',
    value: 'CONFIRMED',
  },
  EXTERNAL_PROVIDER: {
    title: 'External Provider',
    value: 'EXTERNAL_PROVIDER',
  },
  UNKNOWN: {
    title: 'Unknown',
    value: 'UNKNOWN',
  },
  RESET_REQUIRED: {
    title: 'Reset Required',
    value: 'RESET_REQUIRED',
  },
  FORCE_CHANGE_PASSWORD: {
    title: 'Force Change Password',
    value: 'FORCE_CHANGE_PASSWORD',
  },
});

const MessageAction = Object.freeze({
  RESEND: 'RESEND',
  SUPPRESS: 'SUPPRESS',
});

const MAX_USERS_PER_BATCH = 50;

export {
  AccessType,
  AccountType,
  Base,
  Group,
  MAX_USERS_PER_BATCH,
  MessageAction,
  MfaConfiguration,
  MfaType,
  UserStatus,
  WebAuthnUserVerification,
};

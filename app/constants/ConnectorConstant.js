const Type = Object.freeze({
  AWS: {
    title: 'AWS',
    value: 'aws',
    iconPath: '/images/icons/amazon.svg',
    i18nSubtitle: '__subtitleConnectorTypeAws',
    i18nSecretInputFields: [
      '__fieldAwsSecretAccessKey',
    ],
    i18nValidateAction: '__actionValidateCredentials',
    i18nValidateMessage: '__messageCredentialsValidated',
    i18nValidating: '__actionValidating',
    allowAwsCredential: true,
    supportsValidate: true,
  },
  S3: {
    title: 'Amazon S3',
    value: 's3',
    iconPath: '/images/icons/s3.svg',
    i18nSubtitle: '__subtitleConnectorTypeS3',
    i18nSecretInputFields: [
      '__fieldAwsSecretAccessKey',
    ],
    i18nValidateAction: '__actionValidateCredentials',
    i18nValidateMessage: '__messageCredentialsValidated',
    i18nValidating: '__actionValidating',
    allowAwsCredential: true,
    supportsValidate: true,
  },
  OPENSEARCH: {
    title: 'OpenSearch',
    value: 'opensearch',
    iconPath: '/images/icons/opensearch.svg',
    i18nSubtitle: '__subtitleConnectorTypeOpenSearch',
    i18nValidateAction: '__actionTestConnection',
    i18nValidateMessage: '__messageConnectionTested',
    i18nValidating: '__actionTesting',
    allowAwsCredential: false,
    supportsValidate: true,
  },
  MYSQL: {
    title: 'MySQL',
    value: 'mysql',
    iconPath: '/images/icons/mysql.svg',
    i18nSubtitle: '__subtitleConnectorTypeMySql',
    i18nSecretInputFields: [
      '__fieldDatabasePassword',
    ],
    i18nValidateAction: '__actionTestConnection',
    i18nValidateMessage: '__messageConnectionTested',
    i18nValidating: '__actionTesting',
    allowAwsCredential: false,
    supportsValidate: true,
  },
  HTTP: {
    title: 'HTTP',
    value: 'http',
    iconPath: '/images/icons/http.svg',
    i18nSubtitle: '__subtitleConnectorTypeHttp',
    allowAwsCredential: false,
    supportsValidate: false,
  },
});

const CredentialType = Object.freeze({
  ACCESS_KEY: {
    i18nTitle: '__fieldCredentialTypeAccessKey',
    value: 'accessKey',
    i18nSubtitle: '__subtitleCredentialTypeAccessKey',
  },
  IAM_ROLE: {
    i18nTitle: '__fieldCredentialTypeIamRole',
    value: 'iamRole',
    i18nSubtitle: '__subtitleCredentialTypeIamRole',
  },
});

export {
  CredentialType,
  Type,
};

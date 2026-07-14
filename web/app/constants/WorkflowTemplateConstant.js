const ConstantDataType = Object.freeze({
  INT: {
    value: 'int',
  },
  FLOAT: {
    value: 'float',
  },
  STRING: {
    value: 'string',
  },
  BOOLEAN: {
    value: 'boolean',
  },
});

const ReferenceType = Object.freeze({
  CONSTANT: {
    value: 'constant',
  },
  RESOURCE: {
    value: 'resource',
  },
  RESOURCE_ID: {
    value: 'resource_id',
  },
});

const ImportDefinitionStatus = Object.freeze({
  FAILED: {
    i18nTitle: '__fieldStatusFailed',
    value: 'FAILED',
  },
  SUCCESS: {
    i18nTitle: '__fieldStatusSucceeded',
    value: 'SUCCESS',
  },
});

export {
  ConstantDataType,
  ImportDefinitionStatus,
  ReferenceType,
};

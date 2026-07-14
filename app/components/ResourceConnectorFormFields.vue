<script setup>
import { ConnectorConstant } from '~/constants';
import { ConnectorFactory } from '~/models/server/connector';

/**
 * @import { Connector } from '~/models/server/connector'
 */

/**
 * @type {{ resource: Connector }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

/**
 * @type {Ref<Connector>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const selectableConnectorTypes = Object.values(ConnectorConstant.Type);
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('connectorName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.connectorName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('connectorType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.connectorType"
      :disabled="!!props.resource"
      :items="selectableConnectorTypes.map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = ConnectorFactory.create({
          connectorName: formData.connectorName,
          connectorType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.connectorType === ConnectorConstant.Type.S3.value">
    <ResourceConnectorFormFieldsS3
      v-model:account-id="formData.accountId"
      v-model:aws-access-key-id="formData.awsAccessKeyId"
      v-model:aws-secret-access-key="formData.awsSecretAccessKey"
      v-model:credential-type="formData.credentialType"
      v-model:endpoint-url="formData.endpointUrl"
      v-model:role-name="formData.roleName"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.connectorType === ConnectorConstant.Type.AWS.value">
    <ResourceConnectorFormFieldsAws
      v-model:account-id="formData.accountId"
      v-model:aws-access-key-id="formData.awsAccessKeyId"
      v-model:aws-secret-access-key="formData.awsSecretAccessKey"
      v-model:credential-type="formData.credentialType"
      v-model:region-name="formData.regionName"
      v-model:role-name="formData.roleName"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.connectorType === ConnectorConstant.Type.OPENSEARCH.value">
    <ResourceConnectorFormFieldsOpenSearch
      v-model:open-search-host="formData.openSearchHost"
      v-model:open-search-port="formData.openSearchPort"
      v-model:headers="formData.headers"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.connectorType === ConnectorConstant.Type.MYSQL.value">
    <ResourceConnectorFormFieldsMySql
      v-model:mysql-host="formData.mysqlHost"
      v-model:mysql-port="formData.mysqlPort"
      v-model:mysql-username="formData.mysqlUsername"
      v-model:mysql-password="formData.mysqlPassword"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.connectorType === ConnectorConstant.Type.HTTP.value">
    <ResourceConnectorFormFieldsHttp
      v-model:headers="formData.headers"
      :hidden-fields="props.hiddenFields"
    />
  </template>
</template>

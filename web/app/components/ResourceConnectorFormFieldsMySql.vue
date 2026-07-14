<script setup>
import { ConnectorConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const connectorId = defineModel('connectorId', {
  type: String,
  default: null,
});

const mysqlHost = defineModel('mysqlHost', {
  type: String,
  default: null,
});

const mysqlPort = defineModel('mysqlPort', {
  type: [String, Number],
  default: null,
});

const mysqlUsername = defineModel('mysqlUsername', {
  type: String,
  default: null,
});

const mysqlPassword = defineModel('mysqlPassword', {
  type: String,
  default: null,
});

const databaseName = defineModel('databaseName', {
  type: String,
  default: null,
});

const tableName = defineModel('tableName', {
  type: String,
  default: null,
});

const lastModifiedTsField = defineModel('lastModifiedTsField', {
  type: String,
  default: null,
});
</script>

<template>
  <!-- Used in ResourceLoaderFormFieldsStandardSourceForm -->
  <ResourceConnectorPaginatedSelect
    v-if="!props.hiddenFields.includes('connectorId')"
    v-model="connectorId"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.CONNECTOR.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.MYSQL.value },
    ]"
    required
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mysqlHost')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabaseHost')"
    required
  >
    <AppTextField
      :id="id"
      v-model="mysqlHost"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mysqlPort')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabasePort')"
    required
  >
    <AppTextField
      :id="id"
      v-model.integer="mysqlPort"
      type="number"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mysqlUsername')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabaseUsername')"
    required
  >
    <AppTextField
      :id="id"
      v-model="mysqlUsername"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mysqlPassword')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabasePassword')"
    required
  >
    <AppSecretInput
      :id="id"
      v-model="mysqlPassword"
      :is-reset-button-visible="!!mysqlHost"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('databaseName')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabaseName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="databaseName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('tableName')"
    v-slot="{ id, label }"
    :label="$t('__fieldDatabaseTableName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="tableName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('lastModifiedTsField')"
    v-slot="{ id, label }"
    :label="$t('__fieldLastModifiedTsField')"
    :tooltip="$t('__tooltipResourceLoaderConnectorLastModifiedTsField')"
    required
  >
    <AppTextField
      :id="id"
      v-model="lastModifiedTsField"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

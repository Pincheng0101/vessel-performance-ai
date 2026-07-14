<script setup>
import { ConnectorConstant } from '~/constants';

const connectorId = defineModel('connectorId', {
  type: String,
  default: '',
});

const query = defineModel('query', {
  type: String,
  default: '',
});

const args = defineModel('args', {
  type: [Array, Object],
  default: null,
});

const database = defineModel('database', {
  type: String,
  default: null,
});

const readOnly = defineModel('readOnly', {
  type: Boolean,
  default: true,
});
</script>

<template>
  <ResourceConnectorPaginatedSelect
    v-model="connectorId"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.MYSQL.value },
    ]"
    :return-object="false"
    required
    :tooltip="$t('__tooltipAgentMySqlConnector')"
  />
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldSqlQuery')"
    :tooltip="$t('__tooltipWorkflowActionSqlQuery')"
    required
  >
    <AppMySqlEditor
      :id="id"
      v-model="query"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldSqlParameter', 2)"
    :tooltip="$t('__tooltipWorkflowActionSqlParameters')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="args"
      :rules="(
        $validator
          .defineField(label)
          .json()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldDatabase')"
    :tooltip="$t('__tooltipAgentMySqlDatabase')"
  >
    <AppTextField
      :id="id"
      v-model="database"
      :rules="(
        $validator
          .defineField(label)
          .collect()
      )"
      clearable
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldReadOnly')"
    :tooltip="$t('__tooltipAgentMySqlReadOnly')"
  >
    <AppSwitch
      :id="id"
      v-model="readOnly"
    />
  </AppInputGroup>
</template>

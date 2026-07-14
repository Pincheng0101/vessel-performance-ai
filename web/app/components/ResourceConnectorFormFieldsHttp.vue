<script setup>
import { ConnectorConstant, JsonSchemaConstant, ResourceConstant } from '~/constants';

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

const headers = defineModel('headers', {
  type: Object,
  default: {},
});
</script>

<template>
  <ResourceConnectorPaginatedSelect
    v-if="!props.hiddenFields.includes('connectorId')"
    v-model="connectorId"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.CONNECTOR.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value },
    ]"
    required
  />
  <StateInputGroup
    v-if="!props.hiddenFields.includes('headers')"
    v-model="headers"
    :label="$t('__fieldHttpHeader', 2)"
    :enable-state-input-switch="false"
    :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
    enable-json-input-switch
  >
    <template #default="{ label }">
      <AppHttpHeaderTable
        v-model:object="headers"
        :aria-label="label"
        enable-secret-value-object
      />
    </template>
  </StateInputGroup>
</template>

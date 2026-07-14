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

const openSearchHost = defineModel('openSearchHost', {
  type: String,
  default: null,
});

const openSearchPort = defineModel('openSearchPort', {
  type: [String, Number],
  default: null,
});

const indexName = defineModel('indexName', {
  type: String,
  default: null,
});

const lastModifiedTsField = defineModel('lastModifiedTsField', {
  type: String,
  default: null,
});

const headers = defineModel('headers', {
  type: Object,
  default: {},
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
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.OPENSEARCH.value },
    ]"
    required
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('openSearchHost')"
    v-slot="{ id, label }"
    :label="$t('__fieldOpenSearchHost')"
    required
  >
    <AppTextField
      :id="id"
      v-model="openSearchHost"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('openSearchPort')"
    v-slot="{ id, label }"
    :label="$t('__fieldOpenSearchPort')"
    required
  >
    <AppTextField
      :id="id"
      v-model.integer="openSearchPort"
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
    v-if="!props.hiddenFields.includes('indexName')"
    v-slot="{ id, label }"
    :label="$t('__fieldOpenSearchIndexName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="indexName"
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

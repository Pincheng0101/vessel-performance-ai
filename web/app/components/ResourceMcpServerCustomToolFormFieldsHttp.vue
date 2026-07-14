<script setup>
import { ConnectorConstant, HttpConstant } from '~/constants';

const inputSchema = defineModel('inputSchema', {
  type: Object,
  default: null,
});

const connectorId = defineModel('connectorId', {
  type: String,
  default: null,
});

const url = defineModel('url', {
  type: String,
  default: null,
});

const method = defineModel('method', {
  type: String,
  default: null,
});

const headers = defineModel('headers', {
  type: Object,
  default: () => ({}),
});

const params = defineModel('params', {
  type: Object,
  default: null,
});

const body = defineModel('body', {
  type: Object,
  default: null,
});

const state = reactive({
  connectorResource: null,
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldMethod')"
    :tooltip="$t('__tooltipHttpMethod')"
    required
  >
    <AppSelect
      :id="id"
      v-model="method"
      :items="Object.values(HttpConstant.Method).map(m => ({
        title: m.title,
        value: m.value,
      }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <ResourceConnectorPaginatedSelect
    v-model="connectorId"
    v-model:restored-objects="state.connectorResource"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value },
    ]"
    :return-object="false"
    clearable
    :tooltip="$t('__tooltipHttpConnector')"
  />
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldUrl')"
    :tooltip="$t('__tooltipHttpUrl')"
    required
  >
    <AppTextField
      :id="id"
      v-model="url"
      :rules="(
        $validator
          .defineField(label)
          .httpOrHttps()
          .url()
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    :label="$t('__fieldParameter', 2)"
    :tooltip="$t('__tooltipHttpParams')"
  >
    <AppKeyValuePairTable
      v-model:object="params"
      :item-label="$t('__fieldParameter')"
      :key-field-label="$t('__fieldName')"
    />
  </AppInputGroup>
  <AppInputGroup
    :label="$t('__fieldBody')"
    :tooltip="$t('__tooltipHttpBody')"
  >
    <AppKeyValuePairTable
      v-model:object="body"
      :item-label="$t('__fieldField')"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ label }"
    :label="$t('__fieldInputSchema')"
    :tooltip="$t('__tooltipResourceMcpServerCustomToolInputSchema')"
  >
    <AppJsonSchemaBuilderInput
      v-model:form-data="inputSchema"
      :label="label"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldHttpHeader', 2)"
        :tooltip="$t('__tooltipHttpHeaderMergeWithConnector')"
      >
        <AppHttpHeaderTable
          v-model:object="headers"
          :aria-label="label"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

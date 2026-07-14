<script setup>
import { ConnectorConstant, HttpConstant, OpenSearchConstant } from '~/constants';

const connectorId = defineModel('connectorId', {
  type: String,
  default: '',
});

const method = defineModel('method', {
  type: String,
  default: '',
});

const urlPath = defineModel('urlPath', {
  type: String,
  default: '',
});

const headers = defineModel('headers', {
  type: Object,
  default: null,
});

const params = defineModel('params', {
  type: Object,
  default: null,
});

const body = defineModel('body', {
  type: Object,
  default: null,
});

const isCacheConnection = defineModel('isCacheConnection', {
  type: Boolean,
  default: true,
});

const readOnly = defineModel('readOnly', {
  type: Boolean,
  default: true,
});

const methodOptions = computed(() => [
  HttpConstant.Method.GET,
  HttpConstant.Method.POST,
  HttpConstant.Method.PUT,
  HttpConstant.Method.DELETE,
  HttpConstant.Method.HEAD,
]);
</script>

<template>
  <ResourceConnectorPaginatedSelect
    v-model="connectorId"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.OPENSEARCH.value },
    ]"
    :return-object="false"
    required
    :tooltip="$t('__tooltipAgentOpenSearchConnector')"
  />
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldMethod')"
    :tooltip="$t('__tooltipWorkflowActionOpenSearchMethod')"
    required
  >
    <AppSelect
      :id="id"
      v-model="method"
      :items="methodOptions"
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
    :label="$t('__fieldUrlPath')"
    :tooltip="$t('__tooltipWorkflowActionOpenSearchUrlPath')"
    required
  >
    <AppTextField
      :id="id"
      v-model="urlPath"
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
    :label="$t('__fieldBody')"
    :tooltip="$t('__tooltipWorkflowActionOpenSearchBody')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="body"
      :rules="(
        $validator
          .defineField(label)
          .json()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldHttpHeader', 2)"
        :tooltip="$t('__tooltipWorkflowActionHttpHeader')"
      >
        <AppHttpHeaderTable
          v-model:object="headers"
          :aria-label="label"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldParameter', 2)"
        :tooltip="$t('__tooltipWorkflowActionOpenSearchParams')"
      >
        <AppOpenSearchParameterTable
          v-model:object="params"
          :aria-label="label"
          :url-path="urlPath || OpenSearchConstant.ActionExecutionParams.URL_PATH"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldIsCacheConnection')"
        :tooltip="$t('__tooltipOpenSearchIsCacheConnection')"
      >
        <AppSwitch
          :id="id"
          v-model="isCacheConnection"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldReadOnly')"
        :tooltip="$t('__tooltipResourceMcpServerCustomToolOpenSearchReadOnly')"
      >
        <AppSwitch
          :id="id"
          v-model="readOnly"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

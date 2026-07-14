<script setup>
import { McpServerConstant } from '~/constants';
import { McpServerCustomToolFactory } from '~/models/server/mcpServer';

/**
 * @import { McpServerCustomTool } from '~/models/server/mcpServer'
 */

/**
 * @type {{ items: McpServerCustomTool[], item: McpServerCustomTool }}
 */
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  /**
   * @type {McpServerCustomTool}
   */
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const handleToolTypeChange = (toolType) => {
  state.formData = McpServerCustomToolFactory.create({
    customToolType: toolType,
    name: state.formData.name,
    description: state.formData.description,
  });
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldCustomTool') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.items.map(item => item.name), props.item ? props.item.name : null)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldDescription')"
        :tooltip="$t('__tooltipResourceMcpServerCustomToolDescription')"
      >
        <AppTextarea
          :id="id"
          v-model="state.formData.description"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldType')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.formData.customToolType"
          :items="Object.values(McpServerConstant.CustomToolType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          icon-size="20"
          @update:model-value="handleToolTypeChange"
        />
      </AppInputGroup>
      <template v-if="state.formData.customToolType === McpServerConstant.CustomToolType.HTTP.value">
        <ResourceMcpServerCustomToolFormFieldsHttp
          v-model:input-schema="state.formData.inputSchema"
          v-model:connector-id="state.formData.connectorId"
          v-model:url="state.formData.url"
          v-model:method="state.formData.method"
          v-model:headers="state.formData.headers"
          v-model:params="state.formData.params"
          v-model:body="state.formData.body"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.LAMBDA.value">
        <ResourceMcpServerCustomToolFormFieldsLambda
          v-model:input-schema="state.formData.inputSchema"
          v-model:lambda-function-id="state.formData.lambdaFunctionId"
          v-model:lambda-function-name="state.formData.lambdaFunctionName"
          v-model:payload="state.formData.payload"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.CODE.value">
        <ResourceMcpServerCustomToolFormFieldsCode
          v-model:input-schema="state.formData.inputSchema"
          v-model:code="state.formData.code"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.MYSQL.value">
        <ResourceMcpServerCustomToolFormFieldsMySql
          v-model:connector-id="state.formData.connectorId"
          v-model:query="state.formData.query"
          v-model:args="state.formData.args"
          v-model:database="state.formData.database"
          v-model:read-only="state.formData.readOnly"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.OPENSEARCH.value">
        <ResourceMcpServerCustomToolFormFieldsOpenSearch
          v-model:connector-id="state.formData.connectorId"
          v-model:method="state.formData.method"
          v-model:url-path="state.formData.urlPath"
          v-model:headers="state.formData.headers"
          v-model:params="state.formData.params"
          v-model:body="state.formData.body"
          v-model:is-cache-connection="state.formData.isCacheConnection"
          v-model:read-only="state.formData.readOnly"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.RETRIEVAL.value">
        <ResourceMcpServerCustomToolFormFieldsRetrieval
          v-model:knowledge-base-id="state.formData.knowledgeBaseId"
          v-model:retriever-ids="state.formData.retrieverIds"
          v-model:data-fields="state.formData.dataFields"
          v-model:ranker-id="state.formData.rankerId"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.ATHENA.value">
        <ResourceMcpServerCustomToolFormFieldsAthena
          v-model:connector-id="state.formData.connectorId"
          v-model:database="state.formData.database"
          v-model:workgroup="state.formData.workgroup"
          v-model:output-location="state.formData.outputLocation"
          v-model:catalog="state.formData.catalog"
          v-model:read-only="state.formData.readOnly"
        />
      </template>
      <template v-else-if="state.formData.customToolType === McpServerConstant.CustomToolType.AGENT.value">
        <ResourceMcpServerCustomToolFormFieldsAgent v-model:agent-id="state.formData.agentId" />
      </template>
    </template>
  </AppForm>
</template>

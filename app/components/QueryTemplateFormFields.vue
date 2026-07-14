<script setup>
import { JsonSchemaConstant, QueryTemplateConstant } from '~/constants';
import { Template } from '~/models/server/template';

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const queryString = defineModel('queryString', {
  type: String,
  default: null,
});

const queryTemplate = defineModel('queryTemplate', {
  type: Object,
  default: {
    templateId: null,
    template: null,
    templateVariables: {},
  },
});

const { t } = useI18n();
const { extractJinjaTemplateVariables } = useTemplateVariable();

const state = reactive({
  querySource: null,
  templateResource: null,
});

const initializeState = () => {
  if (queryTemplate.value?.templateId) {
    state.querySource = QueryTemplateConstant.QuerySource.EXISTING_QUERY_TEMPLATE.value;
    // For resource select component
    state.templateResource = jsonPathUtils.isJsonPath(queryTemplate.value.templateId) ? queryTemplate.value.templateId : new Template(queryTemplate.value);
    return;
  }
  if (queryTemplate.value?.template) {
    state.querySource = QueryTemplateConstant.QuerySource.CUSTOM_QUERY_TEMPLATE.value;
    return;
  }
  state.querySource = QueryTemplateConstant.QuerySource.CUSTOM_QUERY_STRING.value;
  queryString.value = queryString.value ?? t('__instructionWorkflowActionCustomQueryString');
};

initializeState();

const handleQuerySourceChange = (v) => {
  state.templateResource = null;
  switch (v) {
    case QueryTemplateConstant.QuerySource.EXISTING_QUERY_TEMPLATE.value:
      queryString.value = null;
      queryTemplate.value = {
        templateId: null,
        template: null,
        templateVariables: QueryTemplateConstant.ActionExecutionParams.EXISTING_QUERY_TEMPLATE_VARIABLES,
      };
      break;
    case QueryTemplateConstant.QuerySource.CUSTOM_QUERY_TEMPLATE.value:
      queryString.value = null;
      queryTemplate.value = {
        templateId: null,
        template: t('__instructionWorkflowActionCustomQueryTemplate'),
        templateVariables: QueryTemplateConstant.ActionExecutionParams.CUSTOM_QUERY_TEMPLATE_VARIABLES,
      };
      break;
    case QueryTemplateConstant.QuerySource.CUSTOM_QUERY_STRING.value:
      queryString.value = t('__instructionWorkflowActionCustomQueryString');
      queryTemplate.value = null;
      break;
  }
  props.onUpdate();
};

/**
 * @param {Template} v
 */
const handleTemplateResourceChange = (v) => {
  if (!v) return;
  queryTemplate.value = {
    ...queryTemplate.value,
    templateId: jsonPathUtils.isJsonPath(v) ? v : v.id,
  };
  props.onUpdate();
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldQuerySource')"
  >
    <AppSelect
      :id="id"
      v-model="state.querySource"
      :items="Object.values(QueryTemplateConstant.QuerySource).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      @update:model-value="handleQuerySourceChange"
    />
  </AppInputGroup>
  <template v-if="state.querySource === QueryTemplateConstant.QuerySource.EXISTING_QUERY_TEMPLATE.value">
    <ResourceTemplatePaginatedSelect
      v-model="state.templateResource"
      :tooltip="$t('__tooltipWorkflowActionExistingQueryTemplate')"
      enable-state-input-switch
      required
      @update:model-value="handleTemplateResourceChange"
      @update:restored-objects="props.onResourcesUpdate"
    />
    <ReferencePathInputGroup
      v-model="queryTemplate.templateVariables"
      :default-value="QueryTemplateConstant.ActionExecutionParams.EXISTING_QUERY_TEMPLATE_VARIABLES"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
      :label="$t('__fieldTemplateVariable', 2)"
      :tooltip="$t('__tooltipWorkflowActionTemplateVariable')"
      :on-update="props.onUpdate"
      required
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJinjaVariableTable
          v-model="queryTemplate.templateVariables"
          :aria-label="label"
          :key-options="extractJinjaTemplateVariables(state.templateResource?.template)"
          :on-update="props.onUpdate"
        />
      </template>
    </ReferencePathInputGroup>
  </template>
  <template v-else-if="state.querySource === QueryTemplateConstant.QuerySource.CUSTOM_QUERY_TEMPLATE.value">
    <ReferencePathInputGroup
      v-model="queryTemplate.template"
      :default-value="t('__instructionWorkflowActionCustomQueryTemplate')"
      :label="$t('__fieldTemplate')"
      :tooltip="$t('__tooltipWorkflowActionCustomQueryTemplate')"
      :on-update="props.onUpdate"
      required
    >
      <template #default="{ id, label }">
        <AppJinjaEditor
          :id="id"
          v-model="queryTemplate.template"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="props.onUpdate"
        />
      </template>
    </ReferencePathInputGroup>
    <ReferencePathInputGroup
      v-model="queryTemplate.templateVariables"
      :default-value="QueryTemplateConstant.ActionExecutionParams.CUSTOM_QUERY_TEMPLATE_VARIABLES"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
      :label="$t('__fieldTemplateVariable', 2)"
      :tooltip="$t('__tooltipWorkflowActionTemplateVariable')"
      :on-update="props.onUpdate"
      required
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJinjaVariableTable
          v-model="queryTemplate.templateVariables"
          :aria-label="label"
          :key-options="extractJinjaTemplateVariables(queryTemplate.template)"
          :on-update="props.onUpdate"
        />
      </template>
    </ReferencePathInputGroup>
  </template>
  <template v-else-if="state.querySource === QueryTemplateConstant.QuerySource.CUSTOM_QUERY_STRING.value">
    <ReferencePathInputGroup
      v-model="queryString"
      :default-value="t('__instructionWorkflowActionCustomQueryString')"
      :label="$t('__fieldQueryString')"
      :tooltip="$t('__tooltipWorkflowActionCustomQueryString')"
      :on-update="props.onUpdate"
      required
    >
      <template #default="{ id, label }">
        <AppJinjaEditor
          :id="id"
          v-model="queryString"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="props.onUpdate"
        />
      </template>
    </ReferencePathInputGroup>
  </template>
</template>

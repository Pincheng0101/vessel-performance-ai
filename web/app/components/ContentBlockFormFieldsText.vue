<script setup>
import { ContentBlockConstant, JsonSchemaConstant } from '~/constants';
import { Template } from '~/models/server/template';

const props = defineProps({
  llmId: {
    type: String,
    default: '',
  },
});

const text = defineModel('text', {
  type: String,
  default: null,
});

const promptTemplate = defineModel('promptTemplate', {
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
  promptSource: null,
  templateResource: null,
  isPromptRewriting: false,
});

const initializeState = () => {
  if (promptTemplate.value?.templateId) {
    state.promptSource = ContentBlockConstant.PromptSource.EXISTING_PROMPT_TEMPLATE.value;
    // For resource select component
    state.templateResource = jsonPathUtils.isJsonPath(promptTemplate.value.templateId) ? promptTemplate.value.templateId : new Template(promptTemplate.value);
    return;
  }
  if (promptTemplate.value?.template) {
    state.promptSource = ContentBlockConstant.PromptSource.CUSTOM_PROMPT_TEMPLATE.value;
    return;
  }
  state.promptSource = ContentBlockConstant.PromptSource.CUSTOM_PROMPT.value;
  text.value = text.value ?? t('__instructionWorkflowActionCustomPrompt');
};

initializeState();

const handlePromptSourceChange = (v) => {
  state.templateResource = null;
  switch (v) {
    case ContentBlockConstant.PromptSource.EXISTING_PROMPT_TEMPLATE.value:
      text.value = null;
      promptTemplate.value = {
        templateId: null,
        template: null,
        templateVariables: ContentBlockConstant.ActionExecutionParams.EXISTING_PROMPT_TEMPLATE_VARIABLES,
      };
      break;
    case ContentBlockConstant.PromptSource.CUSTOM_PROMPT_TEMPLATE.value:
      text.value = null;
      promptTemplate.value = {
        templateId: null,
        template: t('__instructionWorkflowActionCustomPromptTemplate'),
        templateVariables: ContentBlockConstant.ActionExecutionParams.CUSTOM_PROMPT_TEMPLATE_VARIABLES,
      };
      break;
    case ContentBlockConstant.PromptSource.CUSTOM_PROMPT.value:
      text.value = t('__instructionWorkflowActionCustomPrompt');
      promptTemplate.value = null;
      break;
  }
};

const handleTemplateResourceChange = (v) => {
  if (!v) return;
  promptTemplate.value = {
    ...promptTemplate.value,
    templateId: jsonPathUtils.isJsonPath(v) ? v : v.id,
  };
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldPromptSource')"
  >
    <AppSelect
      :id="id"
      v-model="state.promptSource"
      :items="Object.values(ContentBlockConstant.PromptSource).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      @update:model-value="handlePromptSourceChange"
    />
  </AppInputGroup>
  <template v-if="state.promptSource === ContentBlockConstant.PromptSource.EXISTING_PROMPT_TEMPLATE.value">
    <ResourceTemplatePaginatedSelect
      v-model="state.templateResource"
      :tooltip="$t('__tooltipWorkflowActionExistingPromptTemplate')"
      enable-state-input-switch
      required
      @update:model-value="handleTemplateResourceChange"
    />
    <ReferencePathInputGroup
      v-model="promptTemplate.templateVariables"
      :default-value="ContentBlockConstant.ActionExecutionParams.EXISTING_PROMPT_TEMPLATE_VARIABLES"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
      :label="$t('__fieldTemplateVariable', 2)"
      :tooltip="$t('__tooltipWorkflowActionTemplateVariable')"
      required
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJinjaVariableTable
          v-model="promptTemplate.templateVariables"
          :aria-label="label"
          :key-options="extractJinjaTemplateVariables(state.templateResource?.template)"
        />
      </template>
    </ReferencePathInputGroup>
  </template>
  <template v-else-if="state.promptSource == ContentBlockConstant.PromptSource.CUSTOM_PROMPT_TEMPLATE.value">
    <ReferencePathInputGroup
      v-model="promptTemplate.template"
      :default-value="t('__instructionWorkflowActionCustomPromptTemplate')"
      :label="$t('__fieldTemplate')"
      :tooltip="$t('__tooltipWorkflowActionCustomPromptTemplate')"
      required
    >
      <template #default="{ id, label }">
        <AppJinjaEditor
          :id="id"
          v-model="promptTemplate.template"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </template>
    </ReferencePathInputGroup>
    <ReferencePathInputGroup
      v-model="promptTemplate.templateVariables"
      :default-value="ContentBlockConstant.ActionExecutionParams.CUSTOM_PROMPT_TEMPLATE_VARIABLES"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
      :label="$t('__fieldTemplateVariable', 2)"
      :tooltip="$t('__tooltipWorkflowActionTemplateVariable')"
      required
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJinjaVariableTable
          v-model="promptTemplate.templateVariables"
          :aria-label="label"
          :key-options="extractJinjaTemplateVariables(promptTemplate.template)"
        />
      </template>
    </ReferencePathInputGroup>
  </template>
  <template v-else-if="state.promptSource === ContentBlockConstant.PromptSource.CUSTOM_PROMPT.value">
    <ReferencePathInputGroup
      v-model="text"
      :default-value="t('__instructionWorkflowActionCustomPrompt')"
      :label="$t('__fieldPrompt')"
      :tooltip="$t('__tooltipWorkflowActionCustomPrompt')"
      :json-path-switch-disabled="state.isPromptRewriting"
      required
    >
      <template #default="{ id, label }">
        <AppJinjaEditor
          :id="id"
          v-model="text"
          :loading="state.isPromptRewriting"
          :disabled="state.isPromptRewriting"
          :max-lines="12"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        >
          <template #prepend-tools>
            <PromptRewriteButton
              v-model:prompt="text"
              v-model:loading="state.isPromptRewriting"
              :target-llm-id="props.llmId"
              :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
            />
          </template>
        </AppJinjaEditor>
      </template>
    </ReferencePathInputGroup>
  </template>
</template>

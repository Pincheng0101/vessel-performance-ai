<script setup>
import { LlmConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  required: true,
});

const isPromptRewriting = defineModel('isPromptRewriting', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('name')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.agentName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('prompt')"
    v-slot="{ id, label }"
    :label="$t('__fieldPrompt')"
    :tooltip="$t('__tooltipAgentPrompt')"
    required
  >
    <AppJinjaEditor
      :id="id"
      v-model="formData.agentPrompt"
      :loading="isPromptRewriting"
      :disabled="isPromptRewriting"
      :max-lines="10"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    >
      <template #prepend-tools>
        <PromptRewriteButton
          v-model:prompt="formData.agentPrompt"
          v-model:loading="isPromptRewriting"
          :target-llm-id="LlmConstant.DefaultLlm.ID"
          :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
        />
      </template>
    </AppJinjaEditor>
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <template v-if="!props.hiddenFields.includes('uiConfig')">
      <AppFormFieldExpansionPanel
        :title="$t('__titleUiSettings')"
        value="uiConfig"
      >
        <ResourceAgentUiConfigFormFields
          v-model:ui-config="formData.uiConfig"
          :agent-name="formData.agentName"
          :agent-prompt="formData.agentPrompt"
        />
      </AppFormFieldExpansionPanel>
    </template>
  </AppFormFieldExpansionPanels>
</template>

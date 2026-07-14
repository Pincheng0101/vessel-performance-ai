<script setup>
import { LlmConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';

/**
 * @import { Llm } from '~/models/server/llm'
 */

/**
 * @type {{ resource: Llm }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  inputLayout: {
    type: String,
    default: 'default',
  },
  enableStateInputSwitch: {
    type: Boolean,
    default: false,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<Llm>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  isPromptRewriting: false,
});

// Sync local state when the prop changes externally
watch(formData, (after) => {
  props.onUpdate(after);
}, { deep: true });
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('llmName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.llmName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('llmType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.llmType"
      :disabled="!!props.resource"
      :items="Object.values(LlmConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = LlmFactory.create({
          llmName: formData.llmName,
          llmType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.llmType">
    <StateInputGroup
      v-if="!props.hiddenFields.includes('systemPrompt')"
      v-model="formData.systemPrompt"
      :label="$t('__fieldSystemPrompt')"
      :tooltip="$t('__tooltipResourceSystemPrompt')"
      :enable-switch="props.enableStateInputSwitch"
      :state-input-switch-disabled="state.isPromptRewriting"
    >
      <template #default="{ id }">
        <AppJinjaEditor
          :id="id"
          v-model="formData.systemPrompt"
          :loading="state.isPromptRewriting"
          :disabled="state.isPromptRewriting"
          :max-lines="12"
        >
          <template #prepend-tools>
            <PromptRewriteButton
              v-model:prompt="formData.systemPrompt"
              v-model:loading="state.isPromptRewriting"
              :target-llm-id="formData.llmId"
              :target-llm-type="formData.llmType"
              :target-model="formData.model"
              :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
            />
          </template>
        </AppJinjaEditor>
      </template>
    </StateInputGroup>
    <template v-if="formData.llmType === LlmConstant.Type.BEDROCK_ANTHROPIC.value">
      <ResourceLlmFormFieldsBedrockAnthropic
        v-model:account-id="formData.accountId"
        v-model:aws-access-key-id="formData.awsAccessKeyId"
        v-model:aws-secret-access-key="formData.awsSecretAccessKey"
        v-model:credential-type="formData.credentialType"
        v-model:effort="formData.effort"
        v-model:enable-thinking="formData.enableThinking"
        v-model:include-thinking="formData.includeThinking"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:performance-config-latency="formData.performanceConfigLatency"
        v-model:region="formData.region"
        v-model:role-name="formData.roleName"
        v-model:temperature="formData.temperature"
        v-model:thinking-budget-tokens="formData.thinkingBudgetTokens"
        v-model:top-k="formData.topK"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.BEDROCK_NOVA.value">
      <ResourceLlmFormFieldsBedrockNova
        v-model:account-id="formData.accountId"
        v-model:aws-access-key-id="formData.awsAccessKeyId"
        v-model:aws-secret-access-key="formData.awsSecretAccessKey"
        v-model:credential-type="formData.credentialType"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:performance-config-latency="formData.performanceConfigLatency"
        v-model:region="formData.region"
        v-model:role-name="formData.roleName"
        v-model:temperature="formData.temperature"
        v-model:top-k="formData.topK"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.BEDROCK_LLAMA.value">
      <ResourceLlmFormFieldsBedrockLlama
        v-model:account-id="formData.accountId"
        v-model:aws-access-key-id="formData.awsAccessKeyId"
        v-model:aws-secret-access-key="formData.awsSecretAccessKey"
        v-model:credential-type="formData.credentialType"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:performance-config-latency="formData.performanceConfigLatency"
        v-model:region="formData.region"
        v-model:role-name="formData.roleName"
        v-model:temperature="formData.temperature"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.BEDROCK_GPT_OSS.value">
      <ResourceLlmFormFieldsBedrockGptOss
        v-model:account-id="formData.accountId"
        v-model:aws-access-key-id="formData.awsAccessKeyId"
        v-model:aws-secret-access-key="formData.awsSecretAccessKey"
        v-model:credential-type="formData.credentialType"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:performance-config-latency="formData.performanceConfigLatency"
        v-model:region="formData.region"
        v-model:role-name="formData.roleName"
        v-model:temperature="formData.temperature"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.GEMINI.value">
      <ResourceLlmFormFieldsGemini
        v-model:api-key="formData.apiKey"
        v-model:include-thinking="formData.includeThinking"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:temperature="formData.temperature"
        v-model:thinking-budget-tokens="formData.thinkingBudgetTokens"
        v-model:thinking-level="formData.thinkingLevel"
        v-model:top-k="formData.topK"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.OLLAMA.value">
      <ResourceLlmFormFieldsOllama
        v-model:endpoint-url="formData.endpointUrl"
        v-model:frequency-penalty="formData.frequencyPenalty"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:temperature="formData.temperature"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
    <template v-else-if="formData.llmType === LlmConstant.Type.OPENAI.value">
      <ResourceLlmFormFieldsOpenAi
        v-model:api-key="formData.apiKey"
        v-model:include-thinking="formData.includeThinking"
        v-model:max-tokens="formData.maxTokens"
        v-model:model="formData.model"
        v-model:temperature="formData.temperature"
        v-model:thinking-effort="formData.thinkingEffort"
        v-model:top-p="formData.topP"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
        :enable-state-input-switch="props.enableStateInputSwitch"
      />
    </template>
  </template>
</template>

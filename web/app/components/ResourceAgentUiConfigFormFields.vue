<script setup>
import { AgentConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  agentName: {
    type: String,
    default: '',
  },
  agentDescription: {
    type: String,
    default: '',
  },
  agentPrompt: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: null,
  },
});

const uiConfig = defineModel('uiConfig', {
  type: Object,
  required: true,
});

const state = reactive({
  isStarterPromptsGenerating: false,
  isDescriptionGenerating: false,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('avatarImage')"
    class="mb-6"
    :label="$t('__fieldAgentUiConfigAvatar')"
    :tooltip="$t('__tooltipAgentUiConfigAvatar')"
  >
    <AppAvatarImageInput
      v-model:encoded="uiConfig.avatarImage"
      fallback-icon="mdi-robot"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('title')"
    v-slot="{ id, label }"
    :label="$t('__fieldTitle')"
    :tooltip="$t('__tooltipAgentUiConfigTitle')"
  >
    <AppTextField
      :id="id"
      v-model="uiConfig.title"
      :rules="(
        $validator
          .defineField(label)
          .stringLengthLte(64)
          .collect()
      )"
      @update:model-value="v => {
        if (v === '') {
          uiConfig.title = null;
        }
      }"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id }"
    :label="$t('__fieldDescription')"
    :tooltip="$t('__tooltipAgentUiConfigDescription')"
  >
    <AppMarkdownEditor
      :id="id"
      v-model="uiConfig.description"
      :loading="state.isDescriptionGenerating"
      :disabled="state.isDescriptionGenerating"
      @update:model-value="v => {
        if (v === '') {
          uiConfig.description = null;
        }
      }"
    >
      <template #prepend-tools>
        <AgentContentGenerateButton
          v-model:prompt="uiConfig.description"
          v-model:loading="state.isDescriptionGenerating"
          v-bind="AgentConstant.UiConfigContentGenerate.DESCRIPTION"
          :agent-name="props.agentName"
          :agent-description="props.agentDescription"
          :agent-prompt="props.agentPrompt"
          :llm-id="props.llmId"
        />
      </template>
    </AppMarkdownEditor>
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('inputPlaceholder')"
    v-slot="{ id, label }"
    :label="$t('__fieldAgentUiConfigInputPlaceholder')"
    :tooltip="$t('__tooltipAgentUiConfigInputPlaceholder')"
  >
    <AppTextField
      :id="id"
      v-model="uiConfig.inputPlaceholder"
      :rules="(
        $validator
          .defineField(label)
          .stringLengthLte(32)
          .collect()
      )"
      @update:model-value="v => {
        if (v === '') {
          uiConfig.inputPlaceholder = null;
        }
      }"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('starterPrompts')"
    v-slot="{ id }"
    :label="$t('__fieldAgentUiConfigStarterPrompts')"
    :tooltip="$t('__tooltipAgentUiConfigStarterPrompts')"
  >
    <AppEditor
      :id="id"
      v-model="uiConfig.starterPrompts"
      :loading="state.isStarterPromptsGenerating"
      :disabled="state.isStarterPromptsGenerating"
      :min-lines="4"
      :max-lines="6"
      enable-line-wrapping
      @update:model-value="v => {
        if (v === '') {
          uiConfig.starterPrompts = null;
        }
      }"
    >
      <template #prepend-tools>
        <AgentContentGenerateButton
          v-model:prompt="uiConfig.starterPrompts"
          v-model:loading="state.isStarterPromptsGenerating"
          v-bind="AgentConstant.UiConfigContentGenerate.STARTER_PROMPTS"
          :agent-name="props.agentName"
          :agent-description="props.agentDescription || uiConfig.description"
          :agent-prompt="props.agentPrompt"
          :llm-id="props.llmId"
        />
      </template>
    </AppEditor>
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('showStorageButton')"
    v-slot="{ id }"
    :label="$t('__fieldAgentUiConfigShowStorageButton')"
    :tooltip="$t('__tooltipAgentUiConfigShowStorageButton')"
  >
    <AppSwitch
      :id="id"
      v-model="uiConfig.showStorageButton"
    />
  </AppInputGroup>
</template>

<script setup>
import { LlmConstant, PromptRewriterExecutionConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();

const targetLlmType = defineModel('targetLlmType', {
  type: String,
  default: PromptRewriterExecutionConstant.DefaultParams.TARGET_LLM_TYPE,
});

const targetModel = defineModel('targetModel', {
  type: String,
  default: PromptRewriterExecutionConstant.DefaultParams.TARGET_MODEL,
});

const targetLlmId = defineModel('targetLlmId', {
  type: String,
  default: null,
});

const endpointUrl = defineModel('endpointUrl', {
  type: String,
  default: null,
});

const state = reactive({
  targetLlmSource: PromptRewriterExecutionConstant.TargetLlmSource.CUSTOM_LLM.value,
  targetLlmResource: null,
  isTargetModelLoading: false,
  ollamaModels: [],
});

const llmModels = computed(() => Object.values(findField(LlmConstant.Type, targetLlmType.value, 'model') || []));
const ollamaModelNames = computed(() => state.ollamaModels.map(model => model.name));
const isOllamaTypeSelected = computed(() => targetLlmType.value === LlmConstant.Type.OLLAMA.value);

(() => {
  state.targetLlmSource = targetLlmId.value ? PromptRewriterExecutionConstant.TargetLlmSource.EXISTING_LLM.value : PromptRewriterExecutionConstant.TargetLlmSource.CUSTOM_LLM.value;
})();

const handleTargetLlmSourceChange = (value) => {
  state.targetLlmSource = value;
  if (value === PromptRewriterExecutionConstant.TargetLlmSource.CUSTOM_LLM.value) {
    state.targetLlmResource = null;
    targetLlmId.value = null;
    targetLlmType.value = PromptRewriterExecutionConstant.DefaultParams.TARGET_LLM_TYPE;
    targetModel.value = PromptRewriterExecutionConstant.DefaultParams.TARGET_MODEL;
    return;
  }
  targetLlmType.value = null;
  targetModel.value = null;
};

const handleLlmTypeChange = (value) => {
  if (value !== PromptRewriterExecutionConstant.DefaultParams.TARGET_LLM_TYPE) {
    targetModel.value = null;
  }
};

const fetchOllamaModels = async (url) => {
  if (!url) return [];
  try {
    const data = await $fetch(`${url}/api/tags`, {
      timeout: 5000,
    });
    state.ollamaModels = data.models;
  } catch {
    snackbarStore.setFailure(t('__messageRequestError'));
    return [];
  }
};

const handleTargetModelRefresh = async () => {
  state.isTargetModelLoading = true;
  state.ollamaModels = [];
  await fetchOllamaModels(endpointUrl.value);
  state.isTargetModelLoading = false;
};
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('targetLlmSource')"
    v-slot="{ id }"
    :label="$t('__fieldPromptRewriterTargetLlmSource')"
    :tooltip="$t('__tooltipPromptRewriterTargetLlmSource')"
  >
    <AppSelect
      :id="id"
      v-model="state.targetLlmSource"
      :items="Object.values(PromptRewriterExecutionConstant.TargetLlmSource).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      @update:model-value="handleTargetLlmSourceChange"
    />
  </AppInputGroup>
  <template v-if="state.targetLlmSource === PromptRewriterExecutionConstant.TargetLlmSource.CUSTOM_LLM.value">
    <AppInputGroup
      v-if="!props.hiddenFields.includes('targetLlmType')"
      v-slot="{ id, label }"
      :label="$t('__fieldPromptRewriterTargetLlmType')"
      :tooltip="$t('__tooltipPromptRewriterTargetLlmType')"
      required
    >
      <AppSelect
        :id="id"
        v-model="targetLlmType"
        :items="Object.values(LlmConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        @update:model-value="handleLlmTypeChange"
      />
    </AppInputGroup>
    <template v-if="targetLlmType === LlmConstant.Type.OLLAMA.value">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('endpointUrl')"
        v-slot="{ id, label }"
        :label="$t('__fieldEndpointUrl')"
        :tooltip="$t('__tooltipResourceLlmOllamaEndpointUrl')"
        required
      >
        <AppTextField
          :id="id"
          v-model="endpointUrl"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .httpOrHttps()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
    <AppInputGroup
      v-if="!props.hiddenFields.includes('targetModel')"
      v-slot="{ id, label }"
      :label="$t('__fieldPromptRewriterTargetModel')"
      :tooltip="$t('__tooltipPromptRewriterTargetModel')"
      required
    >
      <AppSelect
        :id="id"
        v-model="targetModel"
        :disabled="!targetLlmType || (isOllamaTypeSelected && !endpointUrl)"
        :items="isOllamaTypeSelected ? ollamaModelNames : llmModels"
        :on-refresh="isOllamaTypeSelected ? handleTargetModelRefresh : null"
        :loading="state.isTargetModelLoading"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
  </template>
  <template v-else-if="state.targetLlmSource === PromptRewriterExecutionConstant.TargetLlmSource.EXISTING_LLM.value">
    <ResourceLlmPaginatedSelect
      v-if="!props.hiddenFields.includes('targetLlmId')"
      v-model="targetLlmId"
      v-model:restored-objects="state.targetLlmResource"
      :field-name="$t('__fieldPromptRewriterTargetLlm')"
      :return-object="false"
      :tooltip="$t('__tooltipPromptRewriterTargetLlm')"
      required
    />
  </template>
</template>

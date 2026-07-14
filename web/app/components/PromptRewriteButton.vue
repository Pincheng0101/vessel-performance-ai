<script setup>
import { ActionExecutionConstant, PromptRewriterExecutionConstant, StatusConstant } from '~/constants';
import { LlmActionExecutionPayloadFactory } from '~/models/server/llm';
import { PromptRewriterExecution } from '~/models/server/promptRewriter';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  variables: {
    type: Array,
    default: () => [],
  },
  targetLlmId: {
    type: String,
    default: null,
  },
  targetLlmType: {
    type: String,
    default: null,
  },
  targetModel: {
    type: String,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  // Pass a builder to seed `original_prompt` when the editor is empty; flips
  // the button into Generate mode.
  seedOriginalPromptBuilder: {
    type: Function,
    default: null,
  },
});

const prompt = defineModel('prompt', {
  type: String,
  default: null,
});

const loading = defineModel('loading', {
  type: Boolean,
  default: false,
});

const dialogRef = ref(null);

const state = reactive({
  executionError: null,
  formData: {},
});

const server = useServer();
const { createSignal } = useAbortController();
const signal = createSignal();

const isTargetLlmMissing = computed(() => (!props.targetLlmId && !props.targetLlmType && !props.targetModel && props.hiddenFields.includes('targetLlmId')) || (props.targetLlmType && !props.targetModel));
const isPromptExceedingLengthLimit = computed(() => prompt.value?.length > PromptRewriterExecutionConstant.DefaultParams.ORIGINAL_PROMPT.max);
const isGenerateMode = computed(() => !prompt.value && typeof props.seedOriginalPromptBuilder === 'function');
const isDisabled = computed(() => loading.value || isTargetLlmMissing.value || isPromptExceedingLengthLimit.value || props.disabled || (!prompt.value && !isGenerateMode.value));

{
  state.formData = new PromptRewriterExecution({ ...state.formData });
  if (props.targetLlmId) {
    state.formData.targetLlmId = props.targetLlmId;
  }
  if (props.targetLlmType && !props.targetLlmId) {
    state.formData.targetLlmType = props.targetLlmType;
  }
  if (props.targetModel) {
    state.formData.targetModel = props.targetModel;
  }
}

const rewrite = async (formData) => {
  const promptRewriterData = new PromptRewriterExecution({
    ...formData,
    executionLlm: LlmActionExecutionPayloadFactory.toRequestPayload({
      ...formData.executionLlm,
      messages: [],
    }),
    originalPrompt: prompt.value || props.seedOriginalPromptBuilder?.(),
  });
  const { data, error } = await server.promptRewriterExecution.start(promptRewriterData);
  if (error.value) {
    loading.value = false;
    return;
  }
  return data.value;
};

const fetchPromptRewriterExecution = async (executionArn) => {
  const { data, error } = await server.promptRewriterExecution.get({ executionArn }, { signal });
  if (signal.aborted) return;
  if (error.value) {
    state.executionError = error.value.data;
    return;
  }
  if (data.value.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return await fetchPromptRewriterExecution(executionArn);
  }
  return data.value;
};

const handleSubmit = async (formData) => {
  state.formData = formData;
  loading.value = true;
  dialogRef.value.close();
  const result = await rewrite(formData);
  if (result.executionArn) {
    const promptRewriterExecution = await fetchPromptRewriterExecution(result.executionArn);
    if (promptRewriterExecution?.output) {
      prompt.value = promptRewriterExecution.output;
    }
  }
  loading.value = false;
};

watch(() => props.targetLlmId, (after) => {
  state.formData.targetLlmId = after;
});

watch(() => props.targetLlmType, (after) => {
  state.formData.targetLlmType = after;
});

watch(() => props.targetModel, (after) => {
  state.formData.targetModel = after;
});
</script>

<template>
  <AppDialog
    ref="dialogRef"
    :on-submit="handleSubmit"
  >
    <template #activator="{ onOpen }">
      <div class="d-flex align-center">
        <div :class="{ 'gradient-button-border': !isDisabled }">
          <AppButton
            variant="flat"
            class="px-3 w-auto border-0"
            :text="loading ? $t(isGenerateMode ? '__actionGenerating' : '__actionRewriting') : $t(isGenerateMode ? '__actionGenerate' : '__actionRewrite')"
            :tooltip="$t('__titleModifyItem', { action: $t(isGenerateMode ? '__actionGenerate' : '__actionRewrite'), item: $t('__fieldPrompt') })"
            :disabled="isDisabled"
            :prepend-icon="loading ? 'mdi-creation' : 'mdi-auto-fix'"
            @click="onOpen"
          />
        </div>
        <template v-if="!prompt && !isGenerateMode">
          <AppTooltip
            :text="$t('__tooltipPromptRewriterEmptyPrompt')"
            activator="parent"
            location="bottom start"
          />
        </template>
        <template v-else-if="isTargetLlmMissing">
          <AppTooltip
            :text="$t('__tooltipResourceSelectModelFirst')"
            activator="parent"
            location="bottom start"
          />
        </template>
        <template v-else-if="isPromptExceedingLengthLimit">
          <AppTooltip
            :text="$t('__tooltipPromptRewriterExceedLengthLimit', { max: PromptRewriterExecutionConstant.DefaultParams.ORIGINAL_PROMPT.max })"
            activator="parent"
            location="bottom start"
          />
        </template>
      </div>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <PromptRewriteForm
        :item="state.formData"
        :hidden-fields="props.hiddenFields"
        :variables="props.variables"
        :is-generate-mode="isGenerateMode"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

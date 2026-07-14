<script setup>
import { PromptRewriterExecutionConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';
import { PromptRewriterExecutionExtensions } from '~/models/server/promptRewriter';

const { localLocale } = useCustomLocale();

// Pre-pick the dialog's language option based on the UI locale so zh-TW users
// don't have to manually switch from English every time.
const defaultPromptLanguage = findField(PromptRewriterExecutionConstant.PromptLanguage, localLocale.value, 'value', 'i18nLocale')
  ?? PromptRewriterExecutionConstant.PromptLanguage.ENGLISH.value;

/**
 * @import { PromptRewriterExecution } from '~/models/server/promptRewriter'
 */

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  variables: {
    type: Array,
    default: () => [],
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  isGenerateMode: {
    type: Boolean,
    default: false,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const actionKey = computed(() => props.isGenerateMode ? '__actionGenerate' : '__actionRewrite');

const state = reactive({
  /**
   * @type {PromptRewriterExecution}
   */
  formData: {
    targetLlmType: PromptRewriterExecutionConstant.DefaultParams.TARGET_LLM_TYPE,
    targetModel: PromptRewriterExecutionConstant.DefaultParams.TARGET_MODEL,
    targetLlmId: null,
    extensions: new PromptRewriterExecutionExtensions({
      contentSafety: PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.contentSafety,
      privacyProtection: PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.privacyProtection,
    }),
    executionLlm: LlmFactory.create(PromptRewriterExecutionConstant.DefaultParams.EXECUTION_LLM),
    promptLanguage: defaultPromptLanguage,
  },
});

{
  if (props.item) {
    state.formData = {
      ...objUtils.toRaw(props.item),
      executionLlm: props.item.executionLlm ? LlmFactory.create(props.item.executionLlm) : LlmFactory.create(PromptRewriterExecutionConstant.DefaultParams.EXECUTION_LLM),
    };
  }
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};

const cancel = () => {
  const base = props.item ? objUtils.toRaw(props.item) : {};
  state.formData = {
    ...base,
    extensions: {
      contentSafety: base.extensions?.contentSafety ?? PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.contentSafety,
      privacyProtection: base.extensions?.privacyProtection ?? PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.privacyProtection,
    },
  };
  props.onDiscard();
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t(actionKey), item: $t('__fieldPrompt') })"
    :submit-button-text="$t(actionKey)"
    :on-submit="submit"
    :on-discard="cancel"
  >
    <template #body>
      <PromptRewriteFormFields
        v-model:form-data="state.formData"
        :variables="props.variables"
        :hidden-fields="props.hiddenFields"
        :is-generate-mode="props.isGenerateMode"
      />
    </template>
  </AppForm>
</template>

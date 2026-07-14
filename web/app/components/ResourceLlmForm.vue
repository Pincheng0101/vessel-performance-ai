<script setup>
import { FormConstant, LlmConstant, ResourceConstant } from '~/constants';

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
  allowValidate: {
    type: Boolean,
    default: true,
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

const {
  isValidating,
  validate,
} = useResource();

const formRef = ref(null);
const validationDialogRef = ref(null);

const state = reactive({
  /**
   * @type {Llm}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

// Convert null to empty string to prevent displaying "null" text
if (strUtils.isEmpty(state.formData?.systemPrompt)) {
  state.formData.systemPrompt = '';
}

const i18nSecretInputFields = computed(() => {
  return findField(LlmConstant.Type, state.formData.llmType, 'i18nSecretInputFields') || [];
});

const isValidateButtonDisabled = computed(() => findField(LlmConstant.Type, state.formData.llmType, 'allowAwsCredential') && !state.formData.credentialType);

const validateButtonText = computed(() => {
  return state.formData.llmType ? $t(findField(LlmConstant.Type, state.formData.llmType, 'i18nValidateAction')) : '';
});

const validateButtonLoadingText = computed(() => {
  return state.formData.llmType ? $t(findField(LlmConstant.Type, state.formData.llmType, 'i18nValidating')) : '';
});

const submit = async () => {
  const formData = objUtils.toRaw({
    ...state.formData,
    systemPrompt: strUtils.isEmpty(state.formData?.systemPrompt) ? null : state.formData.systemPrompt,
  });
  await props.onSubmit(formData);
};

const handleValidate = async () => {
  // Show validation dialog if there are secret input fields not set
  const hasSecretInputPlaceHolder = !!document.querySelector(`[id^="${FormConstant.SECRET_INPUT_PLACEHOLDER_ID_PREFIX}"]`);
  if (hasSecretInputPlaceHolder) {
    validationDialogRef.value.open();
    return;
  }
  const form = formRef.value.getForm();
  const isFormValid = (await form.validate()).valid;
  if (!isFormValid) return;
  await validate(ResourceConstant.Type.LLM.module, objUtils.toRaw(state.formData));
};
</script>

<template>
  <AppForm
    ref="formRef"
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldLlm') })"
    :icon="ResourceConstant.Type.LLM.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
    :on-validate="props.allowValidate && validateButtonText ? handleValidate : null"
    :is-validating="isValidating"
    :is-validate-button-disabled="isValidateButtonDisabled"
    :validate-button-text="validateButtonText"
    :validate-button-loading-text="validateButtonLoadingText"
  >
    <template #body>
      <ResourceLlmFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :input-layout="props.inputLayout"
      />
    </template>
  </AppForm>
  <ResourceValidationConfirmDialog
    ref="validationDialogRef"
    :items="i18nSecretInputFields"
  />
</template>

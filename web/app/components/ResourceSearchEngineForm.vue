<script setup>
import { FormConstant, ResourceConstant, SearchEngineConstant } from '~/constants';

/**
 * @import { SearchEngine } from '~/models/server/searchEngine'
 */

/**
 * @type {{ resource: SearchEngine }}
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
   * @type {SearchEngine}
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
  return findField(SearchEngineConstant.Type, state.formData.searchEngineType, 'i18nSecretInputFields') || [];
});

const validateButtonText = computed(() => {
  if (!state.formData.searchEngineType) return '';
  const i18nValidateAction = findField(SearchEngineConstant.Type, state.formData.searchEngineType, 'i18nValidateAction');
  return i18nValidateAction ? $t(i18nValidateAction) : '';
});

const validateButtonLoadingText = computed(() => {
  if (!state.formData.searchEngineType) return '';
  const i18nValidating = findField(SearchEngineConstant.Type, state.formData.searchEngineType, 'i18nValidating');
  return i18nValidating ? $t(i18nValidating) : '';
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
  await validate(ResourceConstant.Type.SEARCH_ENGINE.module, objUtils.toRaw(state.formData));
};
</script>

<template>
  <AppForm
    ref="formRef"
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldSearchEngine') })"
    :icon="ResourceConstant.Type.SEARCH_ENGINE.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
    :on-validate="validateButtonText ? handleValidate : null"
    :is-validating="isValidating"
    :validate-button-text="validateButtonText"
    :validate-button-loading-text="validateButtonLoadingText"
  >
    <template #body>
      <ResourceSearchEngineFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
  <ResourceValidationConfirmDialog
    ref="validationDialogRef"
    :items="i18nSecretInputFields"
  />
</template>

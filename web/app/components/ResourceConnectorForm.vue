<script setup>
import { ConnectorConstant, FormConstant, ResourceConstant } from '~/constants';

/**
 * @import { Connector } from '~/models/server/connector'
 */

/**
 * @type {{ resource: Connector }}
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
   * @type {Connector}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

const i18nSecretInputFields = computed(() => {
  return findField(ConnectorConstant.Type, state.formData.connectorType, 'i18nSecretInputFields') || [];
});

const isValidateButtonDisabled = computed(() => findField(ConnectorConstant.Type, state.formData.connectorType, 'allowAwsCredential') && !state.formData.credentialType);

const supportsValidate = computed(() => findField(ConnectorConstant.Type, state.formData.connectorType, 'supportsValidate'));

const validateButtonText = computed(() => {
  return supportsValidate.value ? $t(findField(ConnectorConstant.Type, state.formData.connectorType, 'i18nValidateAction')) : '';
});

const validateButtonLoadingText = computed(() => {
  return supportsValidate.value ? $t(findField(ConnectorConstant.Type, state.formData.connectorType, 'i18nValidating')) : '';
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
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
  await validate(ResourceConstant.Type.CONNECTOR.module, objUtils.toRaw(state.formData));
};
</script>

<template>
  <AppForm
    ref="formRef"
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldConnector') })"
    :icon="ResourceConstant.Type.CONNECTOR.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
    :on-validate="validateButtonText ? handleValidate : null"
    :is-validating="isValidating"
    :is-validate-button-disabled="isValidateButtonDisabled"
    :validate-button-text="validateButtonText"
    :validate-button-loading-text="validateButtonLoadingText"
  >
    <template #body>
      <ResourceConnectorFormFields
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

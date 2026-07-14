<script setup>
import { McpServerConstant, ResourceConstant } from '~/constants';

/**
 * @import { McpServer } from '~/models/server/mcpServer'
 */
defineOptions({
  inheritAttrs: false,
});

/**
 * @type {{ resource: McpServer }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  initialFormData: {
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

const { t } = useI18n();
const { isOauthDialogOpen, isWaitingAuth, isTestingAuth, isTestingConnection, testOauthFlow, testConnection, startAuthorization, cancelOauthFlow } = useMcpServerOauthTest();

const state = reactive({
  /**
   * @type {McpServer}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
} else if (props.initialFormData) {
  state.formData = objUtils.toRaw(props.initialFormData);
}

watch(() => props.initialFormData, (v) => {
  if (v && !props.resource) state.formData = objUtils.toRaw(v);
});

const streamableHttpAuthType = computed(() => {
  if (state.formData.mcpServerType !== McpServerConstant.Type.STREAMABLE_HTTP.value) return null;
  return state.formData.auth?.authType ?? null;
});

const isHeaderAuth = computed(() => streamableHttpAuthType.value === McpServerConstant.StreamableHttpAuthType.HEADER.value);
const isOauthAuth = computed(() => streamableHttpAuthType.value === McpServerConstant.StreamableHttpAuthType.OAUTH.value);

const isTestConnectionDisabled = computed(() => {
  return !state.formData.endpointUrl || !state.formData.auth?.authPayload?.connectorId;
});

const onValidate = computed(() => {
  if (isHeaderAuth.value) return handleTestConnection;
  if (isOauthAuth.value) return handleTestAuth;
  return null;
});

const isValidating = computed(() => {
  if (isHeaderAuth.value) return isTestingConnection.value;
  if (isOauthAuth.value) return isTestingAuth.value;
  return false;
});

const isValidateButtonDisabled = computed(() => {
  if (isHeaderAuth.value) return isTestConnectionDisabled.value;
  if (isOauthAuth.value) return !state.formData.endpointUrl || isOauthDialogOpen.value;
  return false;
});

const validateButtonText = computed(() => onValidate.value ? t('__actionTestConnection') : '');

const validateButtonLoadingText = computed(() => onValidate.value ? t('__actionTesting') : '');

const handleTestConnection = () => testConnection({
  endpointUrl: state.formData.endpointUrl,
  auth: state.formData.auth,
  mcpServerType: state.formData.mcpServerType,
});

const handleTestAuth = () => {
  testOauthFlow(state.formData.endpointUrl, state.formData.auth, state.formData.mcpServerType);
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldMcpServer') })"
    :icon-path="ResourceConstant.Type.MCP_SERVER.iconPath"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
    :on-validate="onValidate"
    :is-validating="isValidating"
    :is-validate-button-disabled="isValidateButtonDisabled"
    :validate-button-text="validateButtonText"
    :validate-button-loading-text="validateButtonLoadingText"
  >
    <template
      v-if="$slots.actions"
      #actions="slotProps"
    >
      <slot
        name="actions"
        v-bind="slotProps"
      />
    </template>
    <template #body>
      <ResourceMcpServerFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
  <ResourceMcpServerOauthDialog
    v-model="isOauthDialogOpen"
    :is-waiting="isWaitingAuth"
    :on-start-auth="startAuthorization"
    :on-cancel="cancelOauthFlow"
  />
</template>

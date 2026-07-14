<script setup>
import { ConnectorConstant, McpServerPresetConstant } from '~/constants';
import { ConnectorFactory } from '~/models/server/connector';

const props = defineProps({
  preset: {
    type: Object,
    required: true,
  },
  onApply: {
    type: Function,
    required: true,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const server = useServer();
const snackbarStore = useSnackbarStore();

const ConnectorSource = Object.freeze({
  EXISTING: 'existing',
  NEW: 'new',
});

const state = reactive({
  connectorSource: ConnectorSource.EXISTING,
  connectorId: null,
  apiKey: '',
  isApplying: false,
});

const isOauth = computed(() => props.preset.authType === McpServerPresetConstant.AuthType.OAUTH);
const isApiKey = computed(() => props.preset.authType === McpServerPresetConstant.AuthType.API_KEY);

const isApplyDisabled = computed(() => {
  if (isApiKey.value) {
    if (state.connectorSource === ConnectorSource.EXISTING) return !state.connectorId;
    if (state.connectorSource === ConnectorSource.NEW) return !state.apiKey;
  }
  return false;
});

const resetState = () => {
  state.connectorSource = ConnectorSource.EXISTING;
  state.connectorId = null;
  state.apiKey = '';
  state.isApplying = false;
};

watch(model, (v) => {
  if (!v) resetState();
});

const handleApply = async () => {
  state.isApplying = true;
  try {
    if (isApiKey.value && state.connectorSource === ConnectorSource.NEW) {
      const headerName = props.preset.apiKeyHeader || 'Authorization';
      const headerValue = props.preset.apiKeyHeader ? state.apiKey : `Bearer ${state.apiKey}`;
      const newConnector = ConnectorFactory.create({
        connectorType: ConnectorConstant.Type.HTTP.value,
        connectorName: `${props.preset.name} Connector`,
        headers: {
          [headerName]: { value: headerValue, isSecret: true },
        },
      });
      const { data, error } = await server.connector.create(newConnector);
      if (error.value) return;
      snackbarStore.setActionSuccess('__actionCreate');
      props.onApply({ connectorId: data.value.id });
    } else {
      props.onApply({ connectorId: state.connectorId ?? null });
    }
    model.value = false;
  } finally {
    state.isApplying = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="model"
    :aria-label="$t('__titleMcpServerPresetConnectorSetup')"
  >
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title class="d-flex align-center ga-3 px-4 py-3">
          <div class="rounded d-flex align-center justify-center flex-shrink-0 preset-icon">
            <AppImageIcon
              v-if="props.preset.iconPath"
              :src="props.preset.iconPath"
              :width="36"
              :height="36"
              class="ma-0"
              :show-shadow="false"
            />
          </div>
          <span>{{ props.preset.name }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldEndpointUrl')"
          >
            <AppTextField
              :id="id"
              :model-value="props.preset.endpointUrl || '—'"
              readonly
              disabled
            />
          </AppInputGroup>

          <template v-if="isOauth">
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              {{ $t('__subtitleMcpServerPresetOauthNote') }}
            </v-alert>
          </template>

          <template v-if="isApiKey">
            <AppInputGroup
              v-slot="{ id }"
              :label="$t('__titleMcpServerPresetConnectorSetup')"
            >
              <AppSelect
                :id="id"
                v-model="state.connectorSource"
                :items="[
                  { title: $t('__actionUseExistingConnector'), value: ConnectorSource.EXISTING },
                  { title: $t('__actionCreateNewConnector'), value: ConnectorSource.NEW },
                ]"
              />
            </AppInputGroup>
            <ResourceConnectorPaginatedSelect
              v-if="state.connectorSource === ConnectorSource.EXISTING"
              v-model="state.connectorId"
              :filters="[{ field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value }]"
              :return-object="false"
              required
            />
            <AppInputGroup
              v-if="state.connectorSource === ConnectorSource.NEW"
              v-slot="{ id, label }"
              :label="$t('__fieldApiKey')"
              required
            >
              <AppTextField
                :id="id"
                v-model="state.apiKey"
                type="password"
                :hint="$t('__hintMcpServerPresetApiKey')"
                persistent-hint
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </AppInputGroup>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <AppButton
            :text="$t('__actionCancel')"
            color="actionButton"
            :width="100"
            :disabled="state.isApplying"
            @click="onCancel"
          />
          <AppButton
            :text="$t('__actionApply')"
            color="primary"
            :width="130"
            :loading="state.isApplying"
            :disabled="isApplyDisabled"
            @click="handleApply"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.preset-icon {
  width: 36px;
  height: 36px;
}
</style>

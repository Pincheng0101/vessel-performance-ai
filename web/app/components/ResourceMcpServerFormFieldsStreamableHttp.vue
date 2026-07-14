<script setup>
import { ConnectorConstant, McpServerConstant, McpServerPresetConstant } from '~/constants';
import { McpServerAuth, McpServerAuthHeaderPayload } from '~/models/server/mcpServer';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  enableStateInputSwitch: {
    type: Boolean,
    default: false,
  },
});

const auth = defineModel('auth', {
  type: Object,
  default: null,
});

const endpointUrl = defineModel('endpointUrl', {
  type: String,
  default: null,
});

const state = reactive({
  authType: auth.value?.authType ?? null,
  connectorId: auth.value?.authPayload?.connectorId ?? null,
  isPresetDialogOpen: false,
  isPresetSetupDialogOpen: false,
  selectedPreset: null,
  appliedPreset: null,
});

// Resync the selects when the parent replaces auth (e.g. dialog cancel restores it)
watch(auth, (v) => {
  state.authType = v?.authType ?? null;
  state.connectorId = v?.authPayload?.connectorId ?? null;
});

// Sync the preset indicator whenever the URL changes (manual typing, preset apply, or edit load)
watch(endpointUrl, (v) => {
  state.appliedPreset = McpServerPresetConstant.Preset.find(p => p.endpointUrl === v) ?? null;
}, { immediate: true });

const handleAuthTypeChange = (v) => {
  state.connectorId = null;
  auth.value = v ? new McpServerAuth({ authType: v, authPayload: null }) : null;
};

const handleConnectorIdChange = (v) => {
  auth.value = new McpServerAuth({
    authType: McpServerConstant.StreamableHttpAuthType.HEADER.value,
    authPayload: v ? new McpServerAuthHeaderPayload({ connectorId: v }) : null,
  });
};

const applyPreset = (preset, { connectorId } = {}) => {
  endpointUrl.value = preset.endpointUrl;
  if (preset.authType === McpServerPresetConstant.AuthType.OAUTH) {
    state.authType = McpServerConstant.StreamableHttpAuthType.OAUTH.value;
    handleAuthTypeChange(McpServerConstant.StreamableHttpAuthType.OAUTH.value);
  } else if (preset.authType === McpServerPresetConstant.AuthType.NONE) {
    state.authType = null;
    handleAuthTypeChange(null);
  } else if (connectorId) {
    state.authType = McpServerConstant.StreamableHttpAuthType.HEADER.value;
    state.connectorId = connectorId;
    handleConnectorIdChange(connectorId);
  }
};

const handlePresetSelect = (preset) => {
  if (
    preset.authType === McpServerPresetConstant.AuthType.OAUTH
    || preset.authType === McpServerPresetConstant.AuthType.NONE
  ) {
    applyPreset(preset);
    return;
  }
  state.selectedPreset = preset;
  state.isPresetSetupDialogOpen = true;
};

const handlePresetApply = ({ connectorId }) => {
  applyPreset(state.selectedPreset, { connectorId });
};
</script>

<template>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('endpointUrl')"
    v-slot="{ id, label }"
    :label="$t('__fieldEndpointUrl')"
    :enable-state-input-switch="props.enableStateInputSwitch"
    required
  >
    <div class="d-flex align-start ga-2">
      <AppTextField
        :id="id"
        v-model="endpointUrl"
        class="flex-grow-1"
        :rules="(
          $validator
            .defineField(label)
            .httpOrHttps()
            .url()
            .required()
            .collect()
        )"
      >
        <template
          v-if="state.appliedPreset"
          #prepend-inner
        >
          <div class="icon rounded d-flex align-center justify-center flex-shrink-0 mr-1">
            <AppImageIcon
              v-if="state.appliedPreset.iconPath"
              :src="state.appliedPreset.iconPath"
              :width="22"
              :height="22"
              class="ma-0"
              :show-shadow="false"
            />
          </div>
        </template>
      </AppTextField>
      <AppButton
        variant="outlined"
        :text="$t('__actionBrowsePresets')"
        color="primary"
        prepend-icon="mdi-view-grid-outline"
        class="text-none flex-shrink-0"
        @click.stop="state.isPresetDialogOpen = true"
      />
    </div>
  </StateInputGroup>
  <template v-if="!props.hiddenFields.includes('auth')">
    <AppInputGroup
      v-slot="{ id }"
      :label="$t('__fieldMcpServerAuthType')"
      :tooltip="$t('__tooltipMcpServerAuthType')"
    >
      <AppSelect
        :id="id"
        v-model="state.authType"
        :items="Object.values(McpServerConstant.StreamableHttpAuthType).map(t => ({ title: $t(t.i18nTitle), value: t.value }))"
        clearable
        @update:model-value="handleAuthTypeChange"
      />
    </AppInputGroup>
    <ResourceConnectorPaginatedSelect
      v-if="state.authType === McpServerConstant.StreamableHttpAuthType.HEADER.value"
      v-model="state.connectorId"
      :filters="[{ field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value }]"
      :return-object="false"
      required
      @update:model-value="handleConnectorIdChange"
    />
  </template>
  <ResourceMcpServerPresetDialog
    v-model="state.isPresetDialogOpen"
    :on-select="handlePresetSelect"
  />
  <ResourceMcpServerPresetSetupDialog
    v-if="state.selectedPreset"
    v-model="state.isPresetSetupDialogOpen"
    :preset="state.selectedPreset"
    :on-apply="handlePresetApply"
  />
</template>

<style lang="scss" scoped>
.icon {
  width: 22px;
  height: 22px;
  min-width: 22px;
  z-index: 1;
}
</style>

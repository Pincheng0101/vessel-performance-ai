<script setup>
import { AgentConstant } from '~/constants';

const props = defineProps({
  oauthMcpTools: {
    type: Array,
    default: () => [],
  },
  getToolStatus: {
    type: Function,
    required: true,
  },
  connect: {
    type: Function,
    required: true,
  },
  isConnecting: {
    type: Function,
    required: true,
  },
  getError: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Boolean,
  default: false,
});

const actionLabel = (mcpServerId) => {
  if (props.isConnecting(mcpServerId)) return t('__actionConnecting');
  const status = props.getToolStatus(mcpServerId);
  if (status === AgentConstant.McpOauthStatus.UNCONNECTED.value) return t('__actionConnect');
  return t('__actionReconnect');
};

const statusEntry = mcpServerId => Object.values(AgentConstant.McpOauthStatus).find(status => status.value === props.getToolStatus(mcpServerId));
</script>

<template>
  <AppDialog
    v-model="model"
    :on-cancel="props.onCancel"
  >
    <template #body>
      <AppTable
        :title="$t('__titleMcpServerToolConnections')"
        :model-value="props.oauthMcpTools"
        :headers="[
          { title: $t('__fieldName'), key: 'name', value: item => item.name || item.mcpServerId },
          { title: $t('__titleMcpOauthStatus'), key: 'oauthStatus' },
        ]"
        :enable-search="false"
        :server-side="false"
        hide-details
        hide-no-data
        item-value="mcpServerId"
      >
        <template #title-actions>
          <AppButton
            :text="$t('__actionClose')"
            color="actionButton"
            :width="100"
            @click="model = false"
          />
        </template>
        <template #search-top>
          <v-card-text class="pb-0 text-body-2 text-medium-emphasis">
            {{ $t('__instructionMcpOauthNotConnected') }}
          </v-card-text>
        </template>
        <template #item.oauthStatus="{ item }">
          <AppChip
            :text="$t(statusEntry(item.mcpServerId).i18nTitle)"
            :icon="statusEntry(item.mcpServerId).icon"
            :color="statusEntry(item.mcpServerId).color"
          />
        </template>
        <template #actions="{ item }">
          <AppButton
            :text="actionLabel(item.mcpServerId)"
            color="primary"
            :disabled="props.isConnecting(item.mcpServerId)"
            width="100"
            size="small"
            :variant="props.getToolStatus(item.mcpServerId) === AgentConstant.McpOauthStatus.CONNECTED.value ? 'outlined' : 'elevated'"
            @click="props.connect(item.mcpServerId, item.auth.endpoint)"
          />
        </template>
      </AppTable>
    </template>
  </AppDialog>
</template>

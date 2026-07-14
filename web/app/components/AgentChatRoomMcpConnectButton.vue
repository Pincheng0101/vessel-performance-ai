<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  oauthMcpTools: {
    type: Array,
    default: () => [],
  },
  pendingCount: {
    type: Number,
    default: 0,
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
});

const isDialogOpen = defineModel({
  type: Boolean,
  default: false,
});
</script>

<template>
  <v-badge
    :model-value="props.pendingCount > 0"
    color="warning"
    dot
  >
    <v-chip
      class="bg-background"
      color="primaryLight"
      variant="text"
      @click="isDialogOpen = true"
    >
      <div class="d-flex ga-1 align-center">
        <AppImageIcon
          :src="ResourceConstant.Type.MCP_SERVER.iconPath"
          width="16"
          height="16"
          mask-color="text"
        />
        {{ $t('__fieldMcpServer') }}
      </div>
    </v-chip>
  </v-badge>
  <AgentChatRoomMcpDialog
    v-model="isDialogOpen"
    :oauth-mcp-tools="props.oauthMcpTools"
    :get-tool-status="props.getToolStatus"
    :connect="props.connect"
    :is-connecting="props.isConnecting"
    :get-error="props.getError"
    :on-cancel="() => isDialogOpen = false"
  />
</template>

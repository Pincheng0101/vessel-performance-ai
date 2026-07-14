<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  close: {
    type: [Boolean, Number],
    default: false,
  },
  onDelete: {
    type: Function,
    default: () => {},
  },
});

const route = useRoute();
const agentChatStore = useAgentChatStore();
</script>

<template>
  <v-hover v-slot="{ isHovering, props: hoverProps }">
    <v-list-item
      v-bind="hoverProps"
      class="pa-0"
      min-height="36"
      :active="(agentChatStore.currentSessionId || route.params.sessionId) === props.item.sessionId"
      :to="`/agents/${route.params.id}/chat/${props.item.sessionId}`"
      @click="() => {
        if (route.params.sessionId === props.item.sessionId) return;
        agentChatStore.lockNavigation();
      }"
    >
      <div class="d-flex align-center justify-space-between ga-2 px-4">
        <span class="w-100 text-truncate text-body-2">
          {{ props.item.sessionName }}
        </span>
        <ChatSessionActionMenu
          :item="props.item"
          :is-pinned="props.isPinned"
          :persistent="isHovering"
          :close="props.close"
          :on-delete="props.onDelete"
        />
      </div>
    </v-list-item>
  </v-hover>
</template>

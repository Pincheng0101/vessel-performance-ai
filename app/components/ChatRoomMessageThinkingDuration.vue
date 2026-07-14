<script setup>
import { ChatRoomMessage } from '~/models/ui/chatRoom';

const props = defineProps({
  message: {
    type: ChatRoomMessage,
    required: true,
  },
  contentBlock: {
    type: Object,
    required: true,
  },
});

const { formatted } = useElapsedDuration({
  startedAt: () => props.contentBlock.startedAt,
  endedAt: () => props.message.getThinkingBlockEndedAt(props.contentBlock),
});
</script>

<template>
  <span
    v-if="props.contentBlock.startedAt"
    class="ml-1"
  >({{ formatted }})</span>
</template>

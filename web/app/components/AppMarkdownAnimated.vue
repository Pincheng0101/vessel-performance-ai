<script setup>
const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  inline: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    default: '',
  },
  typingDelay: {
    type: Number,
    default: 50,
  },
});

const SEPARATOR = '\n\n';

const state = reactive({
  displayText: '',
  timer: null,
});

const displayedSegments = computed(() => {
  if (!state.displayText) {
    return [];
  }
  if (state.displayText.length === props.text.length) {
    return state.displayText.split(SEPARATOR).filter(s => s.length > 0);
  }
  const lastIndex = state.displayText.lastIndexOf(SEPARATOR);
  if (lastIndex === -1) {
    return [state.displayText];
  }
  const completedPart = state.displayText.substring(0, lastIndex);
  const segments = completedPart.split(SEPARATOR).filter(s => s.length > 0);
  const currentPart = state.displayText.substring(lastIndex + SEPARATOR.length);
  if (currentPart) {
    segments.push(currentPart);
  }
  return segments;
});

const startTyping = () => {
  if (state.timer) return;
  state.timer = setInterval(() => {
    if (state.displayText.length < props.text.length) {
      state.displayText += props.text[state.displayText.length];
      return;
    }
    clearInterval(state.timer);
    state.timer = null;
  }, props.typingDelay);
};

if (props.text) {
  startTyping();
}

watch(() => props.text, (after, before) => {
  if (after.length > before.length) {
    startTyping();
  }
});

onBeforeUnmount(() => {
  clearInterval(state.timer);
});
</script>

<template>
  <template v-if="props.enabled">
    <transition-group
      name="fade"
      tag="span"
      appear
    >
      <template v-if="displayedSegments.length > 0">
        <div
          v-for="(segment, i) in displayedSegments"
          :key="i"
          class="segment"
        >
          <AppMarkdown
            :text="segment"
            :inline="props.inline"
          />
        </div>
      </template>
      <template v-else>
        <slot name="loading" />
      </template>
    </transition-group>
  </template>
  <template v-else>
    <AppMarkdown :text="props.text" />
  </template>
</template>

<style lang="scss" scoped>
.segment:not(:first-of-type) {
  margin-top: 16px;
}
.fade-enter-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from {
  opacity: 0;
}
.fade-enter-to {
  opacity: 1;
}
</style>

<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
});

const chars = computed(() => Array.from(props.text));
</script>

<template>
  <span class="typing-text">
    <span
      v-for="(char, i) in chars"
      :key="i"
      :class="{ char: props.enabled }"
      :style="props.enabled ? { animationDelay: `${i * 0.08}s` } : null"
    >{{ char }}</span>
  </span>
</template>

<style lang="scss" scoped>
.typing-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.char {
  display: inline-block;
  opacity: 0.5;
  animation: charPulse 1.2s infinite ease-in-out;
}

@keyframes charPulse {
  0%, 80%, 100% {
    opacity: 0.5;
  }
  40% {
    opacity: 1;
  }
}
</style>

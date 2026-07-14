<script setup>
const props = defineProps({
  dotCount: {
    type: Number,
    default: 10,
  },
});

const delays = computed(() => Array.from({ length: props.dotCount }, (_, i) => `${(i - props.dotCount / 2) * 0.2}s`));
</script>

<template>
  <div class="d-flex justify-center align-center">
    <span
      v-for="(delay, i) in delays"
      :key="i"
      class="dot mx-1"
      :style="{ animationDelay: delay }"
    />
  </div>
</template>

<style lang="scss" scoped>
.dot {
  width: 12px;
  height: 12px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

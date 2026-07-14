<script setup>
const props = defineProps({
  onCompare: {
    type: Function,
    required: true,
  },
  intervalDuration: {
    type: Number,
    default: 1000,
  },
});

const data = defineModel({
  type: [String, Array],
  default: [],
});

const state = reactive({
  timer: null,
  previousData: objUtils.toRaw(data.value),
});

const startInterval = () => {
  state.timer = setInterval(async () => {
    await props.onCompare(jsonUtils.safeStringify(data.value) === jsonUtils.safeStringify(state.previousData));
    state.previousData = objUtils.toRaw(data.value);
  }, props.intervalDuration);
};

const stopInterval = () => {
  clearInterval(state.timer);
  state.timer = null;
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    stopInterval();
    return;
  }
  startInterval();
};

onMounted(() => {
  startInterval();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  clearInterval(state.timer);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div />
</template>

<script setup>
const props = defineProps({
  size: {
    type: Number,
    default: 40,
  },
  width: {
    type: Number,
    default: 3,
  },
  showElapsedTime: {
    type: Boolean,
    default: false,
  },
  startTime: {
    type: Number,
    default: 0,
  },
  // Hardcode color to avoid flickering
  color: {
    type: String,
    default: '#8c57ff',
  },
  class: {
    type: String,
    default: 'd-flex justify-center',
  },
});

const state = reactive({
  timer: null,
  startTime: Date.now(),
  currentTime: Date.now(),
});

if (props.startTime) {
  state.startTime = props.startTime;
}

const elapsedSeconds = computed(() => {
  return (state.currentTime - state.startTime) / 1000;
});

const createTimer = () => {
  return setInterval(() => {
    state.currentTime = Date.now();
  }, 100);
};

onMounted(() => {
  if (props.showElapsedTime) {
    state.timer = createTimer();
  }
});

onBeforeUnmount(() => {
  clearInterval(state.timer);
});
</script>

<template>
  <div :class="props.class">
    <div class="d-flex flex-column align-center">
      <v-progress-circular
        :size="props.size"
        :width="props.width"
        indeterminate
        :color="props.color"
      />
      <template v-if="props.showElapsedTime">
        <div class="text-caption text-primary mt-2">
          <AppTimeDuration
            :milliseconds="elapsedSeconds * 1000"
            display-in-seconds
          />
        </div>
      </template>
    </div>
  </div>
</template>

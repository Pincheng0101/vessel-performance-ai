<script setup>
const props = defineProps({
  height: {
    type: Number,
    default: 16,
  },
  indeterminate: {
    type: Boolean,
    default: false,
  },
  rounded: {
    type: Boolean,
    default: true,
  },
  progress: {
    type: [Number, null],
    default: null,
  },
  estimatedTime: {
    type: Number,
    default: 0,
  },
  message: {
    type: [String, Array],
    default: '',
  },
  showElapsedTime: {
    type: Boolean,
    default: false,
  },
  chunkWidth: {
    type: Number,
    default: 0,
  },
});

const state = reactive({
  currentTime: Date.now(),
  message: Array.isArray(props.message) ? props.message[0] : props.message,
  messageTimer: null,
  progress: 0,
  progressTimer: null,
  startTime: Date.now(),
  elapsedTimer: null,
});

const elapsedSeconds = computed(() => {
  return (state.currentTime - state.startTime) / 1000;
});

const progress = computed(() => props.progress ?? state.progress);

const createElapsedTimer = () => {
  return setInterval(() => {
    state.currentTime = Date.now();
  }, 100);
};

const createMessageTimer = () => {
  const interval = props.estimatedTime * 1000 / props.message.length;
  let index = 1;
  return setInterval(() => {
    state.message = props.message[index];
    index = Math.min(index + 1, props.message.length - 1);
  }, interval);
};

const createProgressTimer = () => {
  const totalProgress = 99;

  // Dynamically determine update interval based on estimated time
  // Ensures shorter estimatedTime leads to more frequent updates
  const updateInterval = Math.max(100, Math.min(500, props.estimatedTime * 5));
  // Calculate how many ticks (updates) should happen during the whole estimated time
  const totalTick = Math.floor((props.estimatedTime * 1000) / updateInterval);
  let tick = 0;

  const updateProgress = () => {
    tick++;
    const timeRatio = tick / totalTick;
    // Easing function to make progress faster at first and slower later
    const easeOut = t => 1 - Math.pow(1 - t, 2);
    const targetProgress = Math.floor(totalProgress * easeOut(timeRatio));

    // If current progress is behind target, randomly catch up a little
    if (state.progress < targetProgress) {
      const gap = targetProgress - state.progress;
      const randomStep = Math.max(1, randomUtils.secureInt(Math.min(3, gap + 1)));
      state.progress = Math.min(state.progress + randomStep, targetProgress);
    }

    // Schedule next update if progress is not yet complete
    if (state.progress < totalProgress) {
      state.progressTimer = setTimeout(updateProgress, updateInterval);
    }
  };

  updateProgress();
};

onMounted(() => {
  if (props.showElapsedTime) {
    state.elapsedTimer = createElapsedTimer();
  }
  if (!props.indeterminate && props.estimatedTime) {
    createProgressTimer();
  }
  if (Array.isArray(props.message) && props.message.length > 1) {
    state.messageTimer = createMessageTimer();
  }
});

onBeforeUnmount(() => {
  clearInterval(state.elapsedTimer);
  clearTimeout(state.progressTimer);
  clearInterval(state.messageTimer);
});
</script>

<template>
  <div class="d-flex flex-column justify-center">
    <template v-if="state.message">
      <div class="text-primary mb-4">
        {{ state.message }}
      </div>
    </template>
    <v-progress-linear
      v-model="progress"
      :height="props.height"
      :indeterminate="props.indeterminate"
      :rounded="props.rounded"
      :chunk-width="props.chunkWidth"
      color="primary"
      striped
    />
    <template v-if="props.showElapsedTime">
      <div class="text-caption text-primary text-right pt-1 pr-1">
        <AppTimeDuration
          :milliseconds="elapsedSeconds * 1000"
          display-in-seconds
        />
      </div>
    </template>
  </div>
</template>

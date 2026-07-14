<script setup>
const props = defineProps({
  milliseconds: {
    type: Number,
    required: true,
  },
});

const dayjs = useDayjs();
const { t } = useI18n();

const state = reactive({
  timer: null,
  remainingMilliseconds: Math.max(Math.ceil(props.milliseconds / 1000) * 1000, 0),
});

const format = computed(() => {
  const duration = dayjs.duration(state.remainingMilliseconds);
  const years = Math.floor(duration.asYears());
  const months = Math.floor(duration.asMonths());
  const days = Math.floor(duration.asDays());
  if (years >= 1) {
    return `Y [${t('__unitYear', years)}] M [${t('__unitMonth', months)}] D [${t('__unitDay', days)}] HH:mm:ss`;
  }
  if (months >= 1) {
    return `M [${t('__unitMonth', months)}] D [${t('__unitDay', days)}] HH:mm:ss`;
  }
  if (days >= 1) {
    return `D [${t('__unitDay', days)}] HH:mm:ss`;
  }
  return 'HH:mm:ss';
});

const startCountdown = () => {
  if (state.remainingMilliseconds <= 0) return;
  state.timer = setInterval(() => {
    state.remainingMilliseconds -= 1000;
    if (state.remainingMilliseconds <= 0) {
      clearInterval(state.timer);
    }
  }, 1000);
};

const stopCountdown = () => {
  clearInterval(state.timer);
};

onMounted(() => {
  startCountdown();
});

onBeforeUnmount(() => {
  stopCountdown();
});
</script>

<template>
  <AppTimeDuration
    :milliseconds="state.remainingMilliseconds"
    :format="format"
  />
</template>

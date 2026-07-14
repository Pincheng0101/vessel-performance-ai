<script setup>
const props = defineProps({
  milliseconds: {
    type: Number,
    required: true,
  },
  displayInSeconds: {
    type: Boolean,
    default: false,
  },
  format: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();
const dayjs = useDayjs();

const duration = computed(() => {
  if (props.format) {
    return dayjs.duration(props.milliseconds, 'milliseconds').format(props.format);
  }
  const seconds = props.milliseconds / 1000;
  if (props.displayInSeconds || seconds < 60) {
    return `${numUtils.format(seconds, 1)} ${t('__unitSecond', seconds)}`;
  }
  return dayjs.duration(seconds, 'seconds').humanize();
});
</script>

<template>
  <div>
    {{ duration }}
  </div>
</template>

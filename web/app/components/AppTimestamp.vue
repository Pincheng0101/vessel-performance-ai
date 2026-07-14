<script setup>
const props = defineProps({
  prefix: {
    type: String,
    default: '',
  },
  value: {
    type: [Number, String],
    required: true,
  },
  isRelative: {
    type: Boolean,
    default: true,
  },
  format: {
    type: String,
    default: 'YYYY-MM-DD HH:mm:ss',
  },
  enableTooltip: {
    type: Boolean,
    default: true,
  },
});

const dayjs = useDayjs();
const { localLocale } = useCustomLocale();

const state = reactive({
  isEnabled: true,
  relativeTime: '',
});

// TODO: Convert to milliseconds in model layer
const normalizedTimestamp = computed(() => {
  if (typeof props.value === 'number') {
    return props.value < 1e12 ? props.value * 1000 : props.value;
  }
  return props.value;
});

const absoluteTime = computed(() => {
  return dayjs(normalizedTimestamp.value).format(props.format);
});

const updateRelativeTime = () => {
  state.relativeTime = dayjs(normalizedTimestamp.value).fromNow();
};

const elapse = async () => {
  if (!state.isEnabled) return;
  updateRelativeTime();
  await delay(1000 * 60);
  await elapse();
};

onMounted(() => {
  elapse();
});

onBeforeUnmount(() => {
  state.isEnabled = false;
});

watch(() => [props.value, localLocale.value], () => {
  updateRelativeTime();
});
</script>

<template>
  <div>
    {{ strUtils.addSpacesAroundAscii(`${props.prefix}${props.isRelative ? state.relativeTime : absoluteTime}`) }}
    <template v-if="props.enableTooltip">
      <AppTooltip
        :text="strUtils.addSpacesAroundAscii(`${props.prefix}${props.isRelative ? absoluteTime : state.relativeTime}`)"
        activator="parent"
      />
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  textColor: {
    type: String,
    default: '',
  },
  maxWidth: {
    type: Number,
    default: null,
  },
  fontSize: {
    type: Number,
    default: 16,
  },
  fontWeight: {
    type: String,
    default: 'regular',
  },
  icon: {
    type: String,
    default: '',
  },
  iconBackground: {
    type: String,
    default: '',
  },
  iconColor: {
    type: String,
    default: 'white',
  },
  iconSize: {
    type: [Number, String],
    default: 16,
  },
  iconPath: {
    type: String,
    default: '',
  },
  iconPathMaskColor: {
    type: String,
    default: '',
  },
});

const prependSlotRef = ref(null);
const appendSlotRef = ref(null);

const state = reactive({
  prependSlotObserver: null,
  prependSlotWidth: 0,
  appendSlotObserver: null,
  appendSlotWidth: 0,
});

const updatePrependSlotWidth = () => {
  state.prependSlotWidth = prependSlotRef.value.offsetWidth || 0;
};

const updateAppendSlotWidth = () => {
  state.appendSlotWidth = appendSlotRef.value.offsetWidth || 0;
};

onMounted(() => {
  updatePrependSlotWidth();
  updateAppendSlotWidth();

  // Observe prependSlotRef for slot changes
  state.prependSlotObserver = new MutationObserver(updatePrependSlotWidth);
  state.prependSlotObserver.observe(prependSlotRef.value, {
    childList: true,
  });

  // Observe appendSlotRef for slot changes
  state.appendSlotObserver = new MutationObserver(updateAppendSlotWidth);
  state.appendSlotObserver.observe(appendSlotRef.value, {
    childList: true,
  });
});

onBeforeUnmount(() => {
  state.prependSlotObserver.disconnect();
  state.appendSlotObserver.disconnect();
});

const textMaxWidth = computed(() => {
  const offset = 20 + 8 + 4; // Icon width + icon margin + text margin
  return props.maxWidth ? `${props.maxWidth - offset - state.prependSlotWidth - state.appendSlotWidth}` : '';
});
</script>

<template>
  <v-sheet
    color="transparent"
    max-width="100%"
    class="d-flex align-center"
  >
    <div ref="prependSlotRef">
      <slot name="prepend" />
    </div>
    <template v-if="props.icon">
      <v-sheet
        :min-height="20"
        :min-width="20"
        color="transparent"
        rounded="sm"
        class="d-flex align-center justify-center mr-2"
        :class="`bg-${props.iconBackground}`"
      >
        <v-icon
          :icon="props.icon"
          :size="props.iconSize"
          :color="props.iconColor"
        />
      </v-sheet>
    </template>
    <template v-else-if="props.iconPath">
      <v-sheet
        :height="20"
        :width="20"
        color="transparent"
        rounded="sm"
        class="d-flex align-center justify-center mr-2"
        :class="`bg-${props.iconBackground}`"
      >
        <AppImageIcon
          :src="props.iconPath"
          :width="props.iconSize"
          :height="props.iconSize"
          class="mr-0"
          :mask-color="props.iconPathMaskColor"
        />
      </v-sheet>
    </template>
    <span
      :class="[
        'text',
        'text-truncate',
        `font-weight-${props.fontWeight}`,
      ]"
    >
      <template v-if="referencePathUtils.hasDollarSuffix(props.text) || referencePathUtils.hasPercentSuffix(props.text)">
        <AppChip
          :text="props.text"
          color="referencePathSuffix"
          size="small"
          variant="outlined"
        />
      </template>
      <template v-else-if="referencePathUtils.hasDollarPrefix(props.text)">
        <AppChip
          :text="props.text"
          color="referencePathPrefix"
          size="small"
          variant="outlined"
        />
      </template>
      <template v-else>
        {{ props.text }}
      </template>
    </span>
    <div ref="appendSlotRef">
      <slot name="append" />
    </div>
  </v-sheet>
</template>

<style lang="scss" scoped>
.text {
  transition: max-width 0.25s;
  max-width: v-bind('`${textMaxWidth}px`');
  font-size: v-bind('`${props.fontSize}px`');
  color: v-bind('props.textColor') !important;
}
</style>

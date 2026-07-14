<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  min: {
    type: [Number, String],
    default: 1,
  },
  max: {
    type: [Number, String],
    default: 1,
  },
  step: {
    type: Number,
    default: 1,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  allowEqualBounds: {
    type: Boolean,
    default: false,
  },
  layout: {
    type: String,
    default: 'default',
  },
});

const minValue = defineModel('minValue', {
  type: [Number, String],
  default: null,
});

const maxValue = defineModel('maxValue', {
  type: [Number, String],
  default: null,
});

const state = reactive({
  range: [minValue.value, maxValue.value],
});

watch(() => minValue.value, (after) => {
  state.range[0] = after;
});

watch(() => maxValue.value, (after) => {
  state.range[1] = after;
});

watch(() => state.range[0], (after) => {
  minValue.value = after;
});

watch(() => state.range[1], (after) => {
  maxValue.value = after;
});

const isLayoutNarrow = computed(() => props.layout === 'narrow');

const isRangeSliderDisabled = computed(() => {
  // Having the same min and max values will break the slider
  return props.disabled || props.min === props.max;
});

const handleEqualBounds = () => {
  if (!props.allowEqualBounds && state.range[0] === state.range[1]) {
    if (state.range[0] <= props.min) {
      state.range[1] += props.step;
      return;
    }
    state.range[0] -= props.step;
  }
};
</script>

<template>
  <v-row>
    <v-col
      :cols="4"
      :sm="isLayoutNarrow ? null : 2"
    >
      <AppTextField
        :id="props.id"
        v-model.integer="state.range[0]"
        type="number"
        :min="props.min"
        :max="state.range[1]"
        :step="props.step"
        :disabled="props.disabled || strUtils.isEmpty(props.min)"
        @update:model-value="(v) => {
          if (v > state.range[1]) {
            state.range[0] = state.range[1];
          }
          if (!v) {
            state.range[0] = 0;
          }
        }"
        @blur="() => {
          if (state.range[0] < props.min) {
            state.range[0] = props.min;
          }
          handleEqualBounds();
        }"
      />
    </v-col>
    <v-col
      :cols="4"
      :sm="isLayoutNarrow ? null : 8"
    >
      <v-range-slider
        v-model="state.range"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :disabled="isRangeSliderDisabled"
        color="primary"
        variant="outlined"
        density="compact"
        thumb-label
        @update:focused="(v) => {
          if (!v) {
            handleEqualBounds();
          }
        }"
      />
    </v-col>
    <v-col
      :cols="4"
      :sm="isLayoutNarrow ? null : 2"
    >
      <AppTextField
        v-model.number="state.range[1]"
        type="number"
        :min="state.range[0]"
        :max="props.max"
        :step="props.step"
        :disabled="props.disabled || strUtils.isEmpty(props.max)"
        @update:model-value="(v) => {
          if (v > props.max) {
            state.range[1] = props.max;
          }
          if (!v) {
            state.range[1] = 0;
          }
        }"
        @blur="() => {
          if (state.range[1] < state.range[0]) {
            state.range[1] = state.range[0];
          }
          handleEqualBounds();
        }"
      />
    </v-col>
  </v-row>
</template>

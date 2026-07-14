<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  modelModifiers: {
    type: Object,
    default: () => ({}),
  },
  defaultValue: {
    type: Number,
    default: 0,
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
  readonly: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: Array,
    default: () => [],
  },
  showInput: {
    type: Boolean,
    default: true,
  },
  layout: {
    type: String,
    default: 'default',
  },
  color: {
    type: String,
    default: 'primary',
  },
  hideDetails: {
    type: [Boolean, String],
    default: false,
  },
});

const [model, modifiers] = defineModel({
  type: Number,
  default: 0,
  set(value) {
    if (modifiers.integer || props.modelModifiers?.integer) {
      return parseInt(value, 10);
    }
    return value;
  },
});

const textFieldRef = ref(null);

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const isLayoutNarrow = computed(() => props.layout === 'narrow');

const validate = () => {
  if (!props.showInput) return true;
  textFieldRef.value.getTextField().validate();
};

defineExpose({
  validate,
});
</script>

<template>
  <v-row>
    <v-col
      :cols="props.showInput ? 8 : 12"
      :sm="props.showInput ? (isLayoutNarrow ? null : 10) : null"
    >
      <v-slider
        v-model="model"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :color="props.color"
        :hide-details="props.hideDetails"
        variant="outlined"
        density="compact"
        thumb-label
      />
    </v-col>
    <v-col
      v-if="props.showInput"
      :cols="4"
      :sm="isLayoutNarrow ? null : 2"
    >
      <div>
        <AppTextField
          :id="props.id"
          ref="textFieldRef"
          v-model.number="model"
          :aria-label="props.ariaLabel"
          type="number"
          :min="props.min"
          :max="props.max"
          :step="props.step"
          :disabled="props.disabled"
          :readonly="props.readonly"
          :rules="props.rules"
          @update:model-value="(v) => {
            if (v > props.max) {
              model = props.max;
            }
            if (!v) {
              model = 0;
            }
          }"
          @blur="() => {
            if (model < props.min) {
              model = props.min;
            }
          }"
        />
      </div>
    </v-col>
  </v-row>
</template>

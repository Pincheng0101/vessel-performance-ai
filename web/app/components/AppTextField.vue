<script setup>
const props = defineProps({
  modelModifiers: {
    type: Object,
    default: () => ({}),
  },
  defaultValue: {
    type: [String, Number],
    default: '',
  },
});

const textFieldRef = ref(null);

const [model, modifiers] = defineModel({
  type: [String, Number, Object],
  default: '',
  set(value) {
    if (modifiers.integer || props.modelModifiers?.integer) {
      if (value) {
        return parseInt(value, 10);
      }
    }
    return value;
  },
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}

defineExpose({
  getTextField: () => {
    return textFieldRef.value;
  },
});
</script>

<template>
  <v-text-field
    ref="textFieldRef"
    v-model.trim="model"
    color="primary"
    variant="outlined"
    density="compact"
    persistent-hint
  >
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
    <template
      v-if="$slots['prepend-inner']"
      #prepend-inner
    >
      <slot name="prepend-inner" />
    </template>
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append" />
    </template>
  </v-text-field>
</template>

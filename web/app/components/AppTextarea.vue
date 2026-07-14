<script setup>
const props = defineProps({
  defaultValue: {
    type: String,
    default: '',
  },
  rows: {
    type: Number,
    default: 2,
  },
});

const model = defineModel({
  type: [String, Number],
  default: '',
});

const textareaRef = ref(null);

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const focus = () => {
  textareaRef.value.focus();
};

defineExpose({
  focus,
});
</script>

<template>
  <v-textarea
    ref="textareaRef"
    v-model.trim="model"
    :rows="props.rows"
    color="primary"
    variant="outlined"
    persistent-hint
  >
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
    <template
      v-if="$slots.prepend"
      #prepend
    >
      <slot name="prepend" />
    </template>
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
  </v-textarea>
</template>

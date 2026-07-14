<script setup>
const props = defineProps({
  tooltip: {
    type: String,
    default: '',
  },
});

const model = defineModel({
  type: [Boolean, Array],
  default: false,
});
</script>

<template>
  <v-checkbox
    v-model="model"
    color="primary"
    density="compact"
    base-color="text"
    persistent-hint
  >
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
    <AppTooltip
      v-if="props.tooltip"
      :text="props.tooltip"
      location="bottom"
      activator="parent"
    />
  </v-checkbox>
</template>

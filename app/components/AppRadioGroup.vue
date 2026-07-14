<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  hint: {
    type: String,
    default: null,
  },
  hideDetails: {
    type: Boolean,
    default: true,
  },
  class: {
    type: String,
    default: 'mb-2',
  },
});

const model = defineModel({
  type: [String, Boolean, Object],
  default: '',
});

const hideDetails = computed(() => props.hideDetails && !props.hint);
</script>

<template>
  <v-radio-group
    v-model="model"
    color="primary"
    density="comfortable"
    persistent-hint
    :hint="props.hint"
    :hide-details="hideDetails"
    :class="props.class"
  >
    <v-radio
      v-for="item in props.items"
      :key="item.value"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
      color="primary"
    />
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
  </v-radio-group>
</template>

<style lang="scss" scoped>
:deep(label) {
  margin-left: 4px;
}
.v-selection-control--disabled {
  opacity: calc(var(--v-disabled-opacity) / 2);
}
</style>

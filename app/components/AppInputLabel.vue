<script setup>
const props = defineProps({
  for: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: null,
  },
  required: {
    type: Boolean,
    default: false,
  },
  tooltip: {
    type: String,
    default: null,
  },
  class: {
    type: String,
    default: 'mb-1',
  },
});
</script>

<template>
  <v-sheet
    :height="20"
    color="transparent"
    class="d-flex justify-space-between"
    :class="props.class"
  >
    <div class="d-flex align-center font-weight-bold ga-1">
      <label :for="props.for">
        {{ props.label }}
      </label>
      <span
        v-if="props.required"
        class="text-critical"
      >
        *
      </span>
      <AppInputTooltip
        v-if="props.tooltip"
        :text="props.tooltip"
      />
    </div>
    <div class="d-flex align-center">
      <slot name="right" />
    </div>
  </v-sheet>
</template>

<style lang="scss" scoped>
.text-caption label {
  height: 18px;
}
</style>

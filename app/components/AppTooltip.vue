<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: 'bottom',
  },
  maxWidth: {
    type: [Number, String],
    default: 300,
  },
});
</script>

<template>
  <v-tooltip
    :close-delay="200"
    :location="props.location"
    :max-width="props.maxWidth"
    :offset="4"
    :open-delay="500"
    content-class="tooltip elevation-1"
  >
    <template #activator="{ props: p }">
      <slot :props="p" />
    </template>
    <AppMarkdown
      :text="strUtils.addSpacesAroundAscii(props.text)"
      inline
    />
  </v-tooltip>
</template>

<style lang="scss" scoped>
:deep(.tooltip) {
  background-color: rgba(var(--v-theme-backgroundTooltip)) !important;
  color: rgba(var(--v-theme-text)) !important;
  border-radius: 8px !important;
  pointer-events: initial !important;
}
</style>

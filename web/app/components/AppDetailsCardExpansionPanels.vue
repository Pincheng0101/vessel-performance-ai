<script setup>
const props = defineProps({
  defaultOpenPanels: {
    type: Array,
    default: () => [],
  },
});

const openedPanels = ref(props.defaultOpenPanels);
const panels = ref(null);

const isEmpty = computed(() => {
  if (panels.value) {
    return [...panels.value.$el.querySelectorAll('.v-expansion-panel-text__wrapper')]
      .every(el => !el.textContent.trim());
  }
  return false;
});
</script>

<template>
  <v-expansion-panels
    ref="panels"
    v-model="openedPanels"
    flat
    multiple
  >
    <slot v-if="!isEmpty" />
  </v-expansion-panels>
</template>

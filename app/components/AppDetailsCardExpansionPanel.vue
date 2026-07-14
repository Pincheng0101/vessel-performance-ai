<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  value: {
    type: [String, Number],
    default: undefined,
  },
});

const panel = ref(null);

const isSelected = computed(() => {
  if (!panel.value) return false;
  return panel.value.groupItem.isSelected.value;
});
</script>

<template>
  <v-expansion-panel
    ref="panel"
    :value="props.value"
  >
    <v-expansion-panel-title
      :aria-label="props.title"
      expand-icon=""
      collapse-icon=""
      class="font-weight-bold"
    >
      <v-icon
        :icon="isSelected ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        class="mr-1"
      />
      {{ props.title }}
    </v-expansion-panel-title>
    <v-expansion-panel-text eager>
      <slot />
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style lang="scss" scoped>
:deep() {
  .v-expansion-panel-text__wrapper {
    padding: 0 !important;
    padding-top: 20px !important;
  }
}
.v-expansion-panel {
  margin-bottom: 16px;
  &:first-of-type {
    margin-top: 8px;
  }
  // For better visual experience
  button {
    padding: 0 8px;
    margin-left: -8px;
    width: calc(100% + 2 * 8px);
  }
}
.v-expansion-panel-title {
  &.v-expansion-panel-title--active, &:hover {
    background-color: rgba(var(--v-theme-backgroundScale1), 0.8);
  }
}
</style>

<script setup>
const { observeInputs, hasInvalidInput } = useFormObserver();

const panel = ref(null);

onMounted(() => {
  observeInputs(panel.value.$el);
});
</script>

<template>
  <v-expansion-panel
    id="expansion-panel"
    ref="panel"
  >
    <v-expansion-panel-title
      class="font-weight-bold"
      :class="{
        error: hasInvalidInput,
      }"
    >
      <slot name="title" />
    </v-expansion-panel-title>
    <v-expansion-panel-text eager>
      <slot name="text" />
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style lang="scss" scoped>
:deep() {
  .v-expansion-panel-text__wrapper {
    padding: 12px !important;
  }
}
.v-expansion-panel {
  border: 1px solid rgba(var(--v-theme-inputBorder));
}
.v-expansion-panel-title {
  padding: 12px;
  &.v-expansion-panel-title--active, &:hover {
    background-color: rgba(var(--v-theme-backgroundScale1), 0.8);
  }
  &.error {
    background-color: rgba(var(--v-theme-error), 0.8);
  }
}
</style>

<script setup>
const props = defineProps({
  isPanelOpen: {
    type: Boolean,
    default: false,
  },
  panelWidth: {
    type: Number,
    default: 600,
  },
  isExpanded: {
    type: Boolean,
    default: false,
  },
  // When embedded in a fixed-height container (e.g. a slide panel), fill the
  // parent height instead of the page-oriented 100dvh min-height.
  fillHeight: {
    type: Boolean,
    default: false,
  },
});

const state = reactive({
  isPanelExpanded: props.isExpanded,
});

const panelWidth = computed(() => {
  return props.panelWidth * (state.isPanelExpanded ? 2 : 1);
});

// Sync with prop changes
watch(() => state.isPanelExpanded, (value) => {
  state.isPanelExpanded = value;
});
</script>

<template>
  <div
    class="d-flex flex-1-1"
    :class="{ 'root-fill': props.fillHeight }"
  >
    <div
      class="content flex-1-1"
      :class="{ 'content-shifted': props.isPanelOpen, 'content-fill': props.fillHeight }"
    >
      <slot />
    </div>
    <slot
      name="panel"
      :expanded="state.isPanelExpanded"
      :on-expand="(v) => state.isPanelExpanded = v"
    />
  </div>
</template>

<style lang="scss" scoped>
// Fill the slide-panel body height so embedded content can resolve `height: 100%`.
.root-fill {
  height: 100%;
}
.content {
  transition: all 0.25s ease;
  min-height: calc(100dvh - 64px - 24px); // 100dvh - app header - footer
  max-width: 100%;
  &.content-shifted {
    max-width: v-bind('`calc(100% - ${panelWidth}px)`');
  }
  // Fill the parent container (slide panel) instead of the page viewport.
  &.content-fill {
    min-height: 0;
    height: 100%;
  }
}
</style>

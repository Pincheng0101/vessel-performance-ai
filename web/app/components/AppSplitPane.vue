<script setup>
const props = defineProps({
  // localStorage key for the persisted ratio. A single global key keeps the
  // layout preference shared across resources (not scoped per agent).
  storageKey: {
    type: String,
    required: true,
  },
  // Left pane width as a percentage of the container
  defaultRatio: {
    type: Number,
    default: 67,
  },
  min: {
    type: Number,
    default: 20,
  },
  max: {
    type: Number,
    default: 80,
  },
});

const display = useDisplay();

// Side-by-side only from the `md` breakpoint up; below that the panes stack
// vertically (matching the previous `sm=12` column behaviour).
const isHorizontal = computed(() => display.mdAndUp.value);

// Persisted, reactive left-pane ratio. Because the layout uses a percentage,
// the panes re-flow to the same ratio whenever the available width changes
// (e.g. the navigation drawer opening or closing) — no extra logic needed.
const ratio = useLocalStorage(props.storageKey, props.defaultRatio);

const container = ref(null);
const state = reactive({
  isDragging: false,
});

const clamp = value => Math.min(props.max, Math.max(props.min, value));

const handlePointerMove = (event) => {
  if (!container.value) return;
  // Measure the container live so the ratio is relative to the actual content
  // width — this absorbs the navigation drawer push/collapse automatically.
  const rect = container.value.getBoundingClientRect();
  if (rect.width === 0) return;
  ratio.value = clamp(((event.clientX - rect.left) / rect.width) * 100);
};

const stopDragging = () => {
  if (!state.isDragging) return;
  state.isDragging = false;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopDragging);
};

const startDragging = () => {
  if (!isHorizontal.value || state.isDragging) return;
  state.isDragging = true;
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopDragging);
};

onBeforeUnmount(stopDragging);
</script>

<template>
  <div
    ref="container"
    class="d-flex"
    :class="isHorizontal ? 'flex-row' : 'flex-column ga-6'"
  >
    <div
      class="app-split-pane__pane"
      :class="isHorizontal ? 'flex-grow-0 flex-shrink-0' : ''"
      :style="isHorizontal ? { flexBasis: `${ratio}%` } : null"
    >
      <slot name="left" />
    </div>
    <div
      v-if="isHorizontal"
      class="app-split-pane__gutter d-flex flex-grow-0 flex-shrink-0 align-stretch justify-center"
      :class="{ 'app-split-pane__gutter--active': state.isDragging }"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="Math.round(ratio)"
      :aria-valuemin="min"
      :aria-valuemax="max"
      @pointerdown.prevent="startDragging"
    />
    <div
      class="app-split-pane__pane"
      :class="isHorizontal ? 'flex-grow-1' : ''"
    >
      <slot name="right" />
    </div>
    <div
      v-if="state.isDragging"
      class="app-split-pane__overlay position-fixed"
    />
  </div>
</template>

<style lang="scss" scoped>
.app-split-pane__pane {
  min-width: 0; // Allow children to shrink instead of forcing overflow
}

.app-split-pane__gutter {
  width: 24px;
  cursor: col-resize;
  touch-action: none;

  &::before {
    content: '';
    width: 2px;
    border-radius: 1px;
    background-color: rgb(var(--v-theme-on-surface));
    opacity: 0.04; // Super faint by default — just enough to hint at the handle
    transition: opacity 0.2s ease, background-color 0.2s ease;
  }

  &:hover::before,
  &--active::before {
    background-color: rgb(var(--v-theme-primary));
    opacity: 1;
  }
}

.app-split-pane__overlay {
  inset: 0;
  z-index: 2000;
  cursor: col-resize;
}
</style>

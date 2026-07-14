<script setup>
// Shared KPI tile for the dashboard: eyebrow label + info tooltip + prominent value.
// The default slot holds the detail area (e.g. delta chip + sparkline); when empty it
// falls back to a plain `sub` caption. Used across the section tabs for a consistent look.
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  value: {
    type: [String, Number],
    default: '',
  },
  tooltip: {
    type: String,
    default: '',
  },
  sub: {
    type: String,
    default: '',
  },
  valueColor: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-card
    variant="flat"
    border
    rounded="lg"
  >
    <v-card-text>
      <div class="d-flex align-center ga-1">
        <span class="text-overline text-medium-emphasis">
          {{ props.label }}
        </span>
        <AppInputTooltip
          v-if="props.tooltip"
          :text="props.tooltip"
        />
      </div>
      <div
        class="text-h4 font-weight-bold mt-1"
        :style="props.valueColor ? { color: props.valueColor } : undefined"
      >
        {{ props.value }}
      </div>
      <slot>
        <div
          v-if="props.sub"
          class="text-caption text-medium-emphasis mt-1"
        >
          {{ props.sub }}
        </div>
      </slot>
    </v-card-text>
  </v-card>
</template>

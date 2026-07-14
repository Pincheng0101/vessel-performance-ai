<script setup>
/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

/**
 * @type {{ item: DisplayField }}
 */
const props = defineProps({
  index: {
    type: Number,
    default: 0,
  },
  item: {
    type: Object,
    required: true,
  },
});

const originalValue = computed(() => {
  return Array.isArray(props.item.value) ? props.item.value[props.index] : props.item.value;
});

const iconColor = computed(() => {
  return typeof props.item.iconColor === 'function'
    ? props.item.iconColor(originalValue.value)
    : props.item.iconColor;
});

const icon = computed(() => {
  return typeof props.item.icon === 'function'
    ? props.item.icon(originalValue.value)
    : props.item.icon;
});
</script>

<template>
  <div class="d-flex align-center justify-center">
    <v-sheet
      :min-height="32"
      :min-width="32"
      color="transparent"
      class="d-flex align-center justify-center"
    >
      <v-icon
        :color="iconColor || 'primary'"
        :icon="icon"
        :size="20"
      />
    </v-sheet>
  </div>
</template>

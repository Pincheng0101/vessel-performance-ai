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

const iconPath = computed(() => {
  return typeof props.item.iconPath === 'function'
    ? props.item.iconPath(originalValue.value, props.index)
    : props.item.iconPath;
});
</script>

<template>
  <div
    v-if="iconPath"
    class="d-flex align-center justify-center"
  >
    <v-sheet
      :min-height="32"
      :min-width="32"
      color="transparent"
      class="d-flex align-center justify-center"
    >
      <AppImageIcon
        :src="iconPath"
        :mask-color="props.item.iconPathMaskColor"
        class="mr-0"
      />
    </v-sheet>
  </div>
</template>

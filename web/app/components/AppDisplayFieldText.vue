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
  mutatedValue: {
    type: [String, Number, Object],
    required: true,
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});

const textValue = computed(() => {
  if (props.mutatedValue === null || props.mutatedValue === undefined) return '';
  return typeof props.mutatedValue === 'string' ? props.mutatedValue : String(props.mutatedValue);
});

const maxChars = computed(() => (
  typeof props.item.maxChars === 'number' && Number.isFinite(props.item.maxChars)
    ? Math.max(props.item.maxChars, 0)
    : null
));

const displayValue = computed(() => {
  const value = textValue.value;
  if (!maxChars.value || value.length <= maxChars.value) return value;
  if (maxChars.value === 0) return '';
  return `${value.slice(0, maxChars.value)}…`;
});
</script>

<template>
  <AppDisplayFieldLink
    :index="props.index"
    :item="props.item"
    :on-click="props.onClick"
  >
    <template v-if="props.item.icon">
      <AppDisplayFieldIcon
        :index="props.index"
        :item="props.item"
        :original-value="props.item.value"
      />
    </template>
    <template v-else-if="props.item.iconPath">
      <AppDisplayFieldIconPath
        :index="props.index"
        :item="props.item"
        :original-value="props.item.value"
      />
    </template>
    <template v-if="referencePathUtils.hasDollarSuffix(props.mutatedValue) || referencePathUtils.hasPercentSuffix(props.mutatedValue)">
      <AppChip
        color="referencePathSuffix"
        variant="outlined"
        :text="displayValue"
      />
    </template>
    <template v-else-if="referencePathUtils.hasDollarPrefix(props.mutatedValue)">
      <AppChip
        color="referencePathPrefix"
        variant="outlined"
        :text="displayValue"
      />
    </template>
    <template v-else>
      {{ displayValue }}
    </template>
  </AppDisplayFieldLink>
</template>

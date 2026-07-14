<script setup>
const expanded = defineModel('expanded', {
  type: Boolean,
  default: true,
});

const props = defineProps({
  tooltipExpanded: {
    type: String,
    default: null,
  },
  tooltipCollapsed: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <AppIconButton
    :icon="expanded ? 'mdi-arrow-collapse-left' : 'mdi-arrow-collapse-right'"
    variant="text"
    icon-size="medium"
    :tooltip="expanded
      ? (props.tooltipExpanded || $t('__actionCollapseInputForm'))
      : (props.tooltipCollapsed || $t('__actionExpandInputForm'))"
    @click="expanded = !expanded"
  />
</template>

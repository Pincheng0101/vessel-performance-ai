<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: '',
  },
  i18nItem: {
    type: String,
    default: null,
  },
  instruction: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <AppInfoCard
    :icon="props.icon"
    :title="$t('__titleNotEnabled', { item: props.i18nItem })"
    :sub-title="$t('__subtitleNotEnabled')"
    :instruction="props.instruction"
  />
</template>

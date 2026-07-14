<script setup>
const object = defineModel('object', {
  type: Object,
  default: null,
});
</script>

<template>
  <AppInputGroup
    :label="$t('__fieldTag', 2)"
    :tooltip="$t('__tooltipAgentToolTags')"
  >
    <AppKeyValuePairTable
      v-model:object="object"
      :item-label="$t('__fieldTag')"
      :key-field-label="$t('__fieldKey')"
      :value-field-label="$t('__fieldValue')"
    />
  </AppInputGroup>
</template>

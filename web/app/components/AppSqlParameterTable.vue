<script setup>
const model = defineModel({
  type: [Object, String],
  default: {},
});
</script>

<template>
  <AppKeyValuePairTable
    v-model:object="model"
    :key-field-label="$t('__fieldName')"
    :key-field-tooltip="$t('__tooltipSqlParameterName')"
    :value-field-tooltip="$t('__tooltipSqlParameterValue')"
    :item-label="$t('__fieldSqlParameter')"
  />
</template>

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
    :key-field-tooltip="$t('__tooltipTemplateVariableName')"
    :value-field-tooltip="$t('__tooltipTemplateVariableValue')"
    :item-label="$t('__fieldTemplateVariable')"
  />
</template>

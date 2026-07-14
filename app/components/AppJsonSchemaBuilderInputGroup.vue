<script setup>
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: [Object, String],
  default: {},
});

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <AppInputGroup :label="props.label || $t('__fieldSchema')">
    <template #right="{ id }">
      <AppSwitch
        :id="`${id}-json-schema-builder-switch`"
        v-model="useJsonInput"
        aria-label="Use JSON"
        density="compact"
        size="xx-small"
        hide-details
        class="mb-0"
      />
      <AppInputLabel
        :for="`${id}-json-schema-builder-switch`"
        :label="$t('__actionUseJson')"
        class="text-caption mb-0"
      />
    </template>
    <template #default="{ label }">
      <AppJsonSchemaBuilderInput
        v-model:form-data="formData"
        v-model:use-json-input="useJsonInput"
        :label="label"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppInputGroup>
</template>

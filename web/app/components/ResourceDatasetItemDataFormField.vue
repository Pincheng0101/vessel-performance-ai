<script setup>
/**
 * @typedef {Object<string, string>} DatasetItemData
 */
/**
 * @type {{ item: DatasetItemData | null }}
 */
const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  fieldNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({}),
});

if (props.fieldNames.length > 0 && props.item) {
  props.fieldNames.forEach(fieldName => formData.value[fieldName] = props.item?.[fieldName]);
}
</script>

<template>
  <AppInputGroup
    v-for="fieldName in props.fieldNames"
    :key="fieldName"
    v-slot="{ id }"
    :label="fieldName"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="formData[fieldName]"
      :disabled="props.loading"
      :enable-json-linter="false"
      allow-primitive
    />
  </AppInputGroup>
</template>

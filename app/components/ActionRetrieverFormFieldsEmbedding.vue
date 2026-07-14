<script setup>
const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const queryString = defineModel('queryString', {
  type: String,
  default: null,
});

const queryTemplate = defineModel('queryTemplate', {
  type: Object,
  default: {
    templateId: null,
    templateVariables: {},
  },
});

</script>

<template>
  <QueryTemplateFormFields
    v-model:query-string="queryString"
    v-model:query-template="queryTemplate"
    :on-update="props.onUpdate"
    :on-resources-update="props.onResourcesUpdate"
  />
</template>

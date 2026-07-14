<script setup>
const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  required: true,
});

const isPromptRewriting = defineModel('isPromptRewriting', {
  type: Boolean,
  default: false,
});

const formRef = ref(null);

defineExpose({
  async validate() {
    return await formRef.value?.validate();
  },
  getFormData() {
    return objUtils.toRaw(formData.value);
  },
});
</script>

<template>
  <v-form
    ref="formRef"
    @submit.prevent=""
  >
    <ResourceAgentConfigRoleFormFields
      v-model:form-data="formData"
      v-model:is-prompt-rewriting="isPromptRewriting"
      :hidden-fields="props.hiddenFields"
    />
  </v-form>
</template>

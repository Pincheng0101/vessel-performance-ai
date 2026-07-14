<script setup>
const formData = defineModel('formData', {
  type: Object,
  required: true,
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
    <ResourceAgentConfigDatasetFormFields v-model:form-data="formData" />
  </v-form>
</template>

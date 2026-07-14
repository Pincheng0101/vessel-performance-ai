<script setup>
/**
 * @type {{ workflowDefinition: WorkflowDefinition }}
 */
const props = defineProps({
  workflowDefinition: {
    type: Object,
    required: true,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  formData: {},
});

if (props.workflowDefinition) {
  state.formData = objUtils.toRaw(props.workflowDefinition);
}

const formFieldsRef = ref(null);

const submit = async () => {
  if (formFieldsRef.value?.handleSubmit) {
    formFieldsRef.value.handleSubmit();
    await props.onSubmit(state.formData);
  }
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldWorkflow') })"
    :on-submit="submit"
    :on-discard="props.onCancel"
  >
    <template #body>
      <WorkflowImportWorkflowDefinitionFormFields
        ref="formFieldsRef"
        v-model:form-data="state.formData"
      />
    </template>
  </AppForm>
</template>

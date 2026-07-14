<script setup>
const props = defineProps({
  resource: {
    type: Object,
    default: () => ({}),
  },
  enableDefinitionFile: {
    type: Boolean,
    default: false,
  },
});

const { createTemplateFromDefinition, publishTemplate } = useWorkflowTemplate();

const dialogRef = ref(null);

defineExpose({
  open: () => dialogRef.value.open(),
});

const submit = async (formData) => {
  if (props.enableDefinitionFile) {
    await createTemplateFromDefinition(formData);
    return;
  }
  await publishTemplate({
    resources: [{
      resourceId: props.resource.id,
      resourceType: props.resource.resourceType,
    }],
    formData,
  });
};
</script>

<template>
  <AppDialog
    ref="dialogRef"
    :on-submit="submit"
  >
    <template #activator="{ onOpen }">
      <slot
        :on-open="onOpen"
        name="activator"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <WorkflowTemplateCreateForm
        :resource="props.resource"
        :enable-definition-file="props.enableDefinitionFile"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

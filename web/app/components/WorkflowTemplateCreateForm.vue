<script setup>
const props = defineProps({
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
  resource: {
    type: Object,
    default: null,
  },
  enableDefinitionFile: {
    type: Boolean,
    default: false,
  },
});

const state = reactive({
  formData: {
    name: '',
    description: '',
    tags: [],
    workflowDefinition: null,
  },
});

if (props.resource) {
  state.formData = {
    name: props.resource.name || '',
    description: props.resource.description || props.resource.definition?.comment || '',
    tags: props.resource.tags || [],
    workflowDefinition: props.resource.definition || null,
  };
}

const downloadWorkflowDefinitionExample = () => {
  fileUtils.download({
    url: '/examples/workflow-definition-example.json',
  });
};

const submit = async () => {
  await props.onSubmit(state.formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t(props.enableDefinitionFile ? '__actionCreate' : '__actionPublish'), item: $t('__fieldTemplate') })"
    :on-submit="submit"
    :on-discard="props.onCancel"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        :label="$t('__fieldDescription')"
        :tooltip="$t('__tooltipWorkflowTemplateDescription')"
      >
        <AppMarkdownEditor v-model="state.formData.description" />
      </AppInputGroup>
      <!-- TODO: Add default options -->
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldTag', 2)"
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.tags"
        />
      </AppInputGroup>
      <template v-if="props.enableDefinitionFile">
        <WorkflowImportWorkflowDefinitionFormFields
          v-model:form-data="state.formData.workflowDefinition"
          :on-example-download="downloadWorkflowDefinitionExample"
          enable-upload-file
        />
      </template>
    </template>
  </AppForm>
</template>

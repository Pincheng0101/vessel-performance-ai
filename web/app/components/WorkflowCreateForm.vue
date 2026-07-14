<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Workflow } from '~/models/server/workflow'
 */

const props = defineProps({
  blankWorkflow: {
    type: Object,
    default: null,
  },
  createMode: {
    type: String,
    default: ResourceConstant.WorkflowCreateMode.FROM_BLANK.value,
  },
  onBlankWorkflowCreate: {
    type: Function,
    default: () => {},
  },
  onWorkflowDefinitionImport: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  /**
   * @type {Workflow}
   */
  formDataFromBlank: null,
  /**
   * @type {WorkflowDefinition}
   */
  formDataFromWorkflowDefinition: null,
  selectedMode: props.createMode,
});

if (props.blankWorkflow) {
  state.formDataFromBlank = objUtils.toRaw(props.blankWorkflow);
}

watch(() => props.createMode, (after) => {
  if (after) {
    state.selectedMode = after;
  }
}, { immediate: true });

const importWorkflowDefinitionFormFieldsRef = ref(null);

const downloadWorkflowDefinitionExample = () => {
  fileUtils.download({
    url: '/examples/workflow-definition-example.json',
  });
};

const submit = async () => {
  switch (state.selectedMode) {
    case ResourceConstant.WorkflowCreateMode.FROM_BLANK.value:
      await props.onBlankWorkflowCreate(state.formDataFromBlank);
      break;
    case ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.value:
      if (importWorkflowDefinitionFormFieldsRef.value?.handleSubmit) {
        importWorkflowDefinitionFormFieldsRef.value.handleSubmit();
        await props.onWorkflowDefinitionImport(state.formDataFromWorkflowDefinition);
      }
      break;
    default:
      break;
  }
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldWorkflow') })"
    :on-discard="props.onCancel"
    :on-submit="submit"
  >
    <template #body>
      <div class="d-flex flex-column ga-3 pb-4">
        <p>
          {{ $t(findField(ResourceConstant.WorkflowCreateMode, state.selectedMode, 'i18nSubtitle')) }}
        </p>
        <template v-if="state.selectedMode === ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.value">
          <div>
            <NuxtLink
              class="text-decoration-underline cursor-pointer"
              @click="downloadWorkflowDefinitionExample"
            >
              {{ $t('__instructionDownloadDefinitionExample') }}
            </NuxtLink>
          </div>
        </template>
      </div>
      <template v-if="state.selectedMode === ResourceConstant.WorkflowCreateMode.FROM_BLANK.value">
        <WorkflowConfigFormFields v-model:form-data="state.formDataFromBlank" />
      </template>
      <template v-else-if="state.selectedMode === ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.value">
        <WorkflowImportWorkflowDefinitionFormFields
          ref="importWorkflowDefinitionFormFieldsRef"
          v-model:form-data="state.formDataFromWorkflowDefinition"
          :on-example-download="downloadWorkflowDefinitionExample"
          enable-upload-file
        />
      </template>
    </template>
  </AppForm>
</template>

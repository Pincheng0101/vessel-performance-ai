<script setup>
/**
 * @import { WorkflowExecution } from '~/models/server/workflowExecution'
 */

const props = defineProps({
  formTitle: {
    type: String,
    default: '',
  },
  inputSchema: {
    type: Object,
    default: null,
  },
  useExternalMemoryInput: {
    type: Boolean,
    default: false,
  },
  stateMemoryInputSelector: {
    type: Object,
    default: null,
  },
  workflowExecution: {
    type: Object,
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    default: null,
  },
});

const route = useRoute();
const dayjs = useDayjs();

const state = reactive({
  /**
   * @type {WorkflowExecution}
   */
  formData: {
    input: {},
    name: '',
    displayName: strUtils.generateRandom(12).toUpperCase(),
    useExternalMemoryInput: props.useExternalMemoryInput,
    stateMemoryInputSelector: props.stateMemoryInputSelector,
  },
  refresh: 0,
  isSubmitting: false,
});

const submit = async () => {
  state.isSubmitting = true;
  /**
   * @type {WorkflowExecution}
   */
  const formData = objUtils.toRaw({
    ...state.formData,
    name: `${route.params.id}-${strUtils.generateRandom(6)}-${dayjs().unix()}`,
  });
  await props.onSubmit(formData);
  state.isSubmitting = false;
};

/**
 * @param {WorkflowExecution} workflowExecution
 */
const restore = (workflowExecution) => {
  state.formData = objUtils.toRaw(workflowExecution);
  state.formData.input = props.inputSchema
    ? objUtils.fillByTemplate(jsonSchemaUtils.generateTemplate(props.inputSchema), workflowExecution.rawInput)
    : workflowExecution.rawInput;
  state.formData.stateMemoryInputSelector = workflowExecution.stateMemoryInputSelector;
};

// Sync local state when the prop changes externally
watch(() => props.workflowExecution, (after) => {
  if (state.isSubmitting) return;
  if (after) {
    restore(after);
  }
}, { immediate: true });

// Sync local state when the prop changes externally
watch(() => props.stateMemoryInputSelector, (after) => {
  state.formData.stateMemoryInputSelector = after;
});

// Sync local state when the prop changes externally
watch(() => props.useExternalMemoryInput, (after) => {
  state.formData.useExternalMemoryInput = after;
});
</script>

<template>
  <AppForm
    :form-title="props.formTitle"
    :on-submit="submit"
    :on-discard="props.onCancel"
    :submit-button-text="$t('__actionStart')"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.displayName"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppJsonSchemaRendererInputGroup
        :key="state.refresh"
        v-model:form-data="state.formData.input"
        :label="$t('__fieldInput')"
        :schema="props.inputSchema"
        :validate-with-schema="!!props.inputSchema"
      />
      <AppFormFieldExpansionPanels>
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldUploadInputToExternalMemory')"
            :tooltip="$t('__tooltipWorkflowUseExternalMemoryInput')"
          >
            <AppSwitch
              :id="id"
              v-model="state.formData.useExternalMemoryInput"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="state.formData.useExternalMemoryInput"
            v-slot="{ id, label }"
            :label="$t('__fieldStateMemoryInputSelector')"
            :tooltip="$t('__tooltipWorkflowStateMemoryInputSelector')"
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.formData.stateMemoryInputSelector"
              :rules="(
                $validator
                  .defineField(label)
                  .json()
                  .collect()
              )"
            />
          </AppInputGroup>
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
    </template>
  </AppForm>
</template>

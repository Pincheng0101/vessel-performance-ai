<script setup>
import { JsonSchemaConstant, StateConstant } from '~/constants';
import { StartNode, StartNodeData } from '~/models/workflow/state/start';

/**
 * @import { Workflow } from '~/models/server/workflow'
 * @import { ObjectJsonSchema } from '~/models/ui/jsonSchema'
 */

/**
 * @type {{ workflow: Workflow }}
 */
const props = defineProps({
  node: {
    type: StartNode,
    required: true,
  },
  onStateFormClose: {
    type: Function,
    default: null,
  },
  onUpdate: {
    type: Function,
    required: true,
  },
  onWorkflowInputSchemaChange: {
    type: Function,
    required: true,
  },
  workflow: {
    type: Object,
    required: true,
  },
});

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {StartNode}
   */
  formData: {},
  /**
   * @type {Workflow}
   */
  workflow: {},
});

// Restore the form data and workflow
{
  state.formData = objUtils.toRaw(props.node);
  state.workflow = objUtils.toRaw(props.workflow);
  // Restore workflow data from node data
  state.workflow.inputSchema = state.formData.data.inputSchema;
}

const handleNextStateUpdate = (v) => {
  state.formData.data.startAt = v;
  update();
};

const update = async () => {
  state.formData.data = new StartNodeData({
    startAt: state.formData.data.startAt,
    inputSchema: state.workflow.inputSchema,
    useExternalMemoryInput: state.formData.data.useExternalMemoryInput,
    stateMemoryInputSelector: state.formData.data.stateMemoryInputSelector,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

/**
 * @param {ObjectJsonSchema} v
 */
const updateInputSchema = async (v) => {
  // Set the schema to null if there are no properties
  if (objUtils.isEmpty(v?.properties || {})) {
    state.workflow.inputSchema = null;
  }
  props.onWorkflowInputSchemaChange(objUtils.toRaw(state.workflow));
  await update();
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :node="props.node"
    :input-schema="state.workflow.inputSchema"
    :form-title="$t(StateConstant.PseudoType.START.i18nTitle)"
    :form-title-icon="StateConstant.PseudoType.START.icon"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="update"
    :show-tabs="false"
    form-title-icon-background="primary"
  >
    <ReferencePathInputGroup
      v-model="state.workflow.inputSchema"
      :enable-reference-path-switch="false"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value, JsonSchemaConstant.DataType.NULL.value]"
      :label="$t('__fieldInputSchema')"
      :schema="JsonSchemaConstant.Base.META_SCHEMA"
      :on-update="updateInputSchema"
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJsonSchemaBuilderInput
          v-model:form-data="state.workflow.inputSchema"
          :label="label"
          :hidden-fields="props.hiddenFields"
          @update:form-data="updateInputSchema"
        />
      </template>
    </ReferencePathInputGroup>
    <AppInputGroup
      v-slot="{ id }"
      :label="$t('__fieldUploadInputToExternalMemory')"
      :tooltip="$t('__tooltipWorkflowUseExternalMemoryInput')"
    >
      <AppSwitch
        :id="id"
        v-model="state.formData.data.useExternalMemoryInput"
        @update:model-value="(v) => {
          if (!v) {
            state.formData.data.stateMemoryInputSelector = null;
          }
          update();
        }"
      />
    </AppInputGroup>
    <AppInputGroup
      v-if="state.formData.data.useExternalMemoryInput"
      v-slot="{ id, label }"
      :label="$t('__fieldStateMemoryInputSelector')"
      :tooltip="$t('__tooltipWorkflowStateMemoryInputSelector')"
      :on-update="update"
    >
      <AppJsonEditor
        :id="id"
        v-model:object="state.formData.data.stateMemoryInputSelector"
        :rules="(
          $validator
            .defineField(label)
            .json()
            .collect()
        )"
        @update:object="update"
      />
    </AppInputGroup>
    <WorkflowNextStateSelect
      v-model="state.formData.data.startAt"
      :node="props.node"
      @update:model-value="handleNextStateUpdate"
    />
  </WorkflowStateForm>
</template>

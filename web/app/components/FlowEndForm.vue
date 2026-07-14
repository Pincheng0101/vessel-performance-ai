<script setup>
import { JsonSchemaConstant, StateConstant } from '~/constants';
import { EndNode, EndNodeData } from '~/models/workflow/state/end';

/**
 * @import { Workflow } from '~/models/server/workflow'
 * @import { ObjectJsonSchema } from '~/models/ui/jsonSchema'
 */

/**
 * @type {{ workflow: Workflow }}
 */
const props = defineProps({
  workflow: {
    type: Object,
    required: true,
  },
  node: {
    type: EndNode,
    required: true,
  },
  onUpdate: {
    type: Function,
    required: true,
  },
  onStateFormClose: {
    type: Function,
    default: null,
  },
  onWorkflowOutputSchemaChange: {
    type: Function,
    required: true,
  },
});

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {EndNode}
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
  state.workflow.outputSchema = state.formData.data.outputSchema;
}

const update = async () => {
  state.formData.data = new EndNodeData({
    outputSchema: state.workflow.outputSchema,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

/**
 * @param {ObjectJsonSchema} v
 */
const updateOutputSchema = async (v) => {
  // Set the schema to null if there are no properties
  if (objUtils.isEmpty(v?.properties || {})) {
    state.workflow.outputSchema = null;
  }
  props.onWorkflowOutputSchemaChange(objUtils.toRaw(state.workflow));
  await update();
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title="$t(StateConstant.PseudoType.END.i18nTitle)"
    :form-title-icon="StateConstant.PseudoType.END.icon"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="update"
    :show-tabs="false"
    form-title-icon-background="primary"
  >
    <ReferencePathInputGroup
      v-model="state.workflow.outputSchema"
      :enable-reference-path-switch="false"
      :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value, JsonSchemaConstant.DataType.NULL.value]"
      :label="$t('__fieldOutputSchema')"
      :schema="JsonSchemaConstant.Base.META_SCHEMA"
      :on-update="updateOutputSchema"
      enable-json-switch
    >
      <template #default="{ label }">
        <AppJsonSchemaBuilderInput
          v-model:form-data="state.workflow.outputSchema"
          :label="label"
          :hidden-fields="props.hiddenFields"
          @update:form-data="updateOutputSchema"
        />
      </template>
    </ReferencePathInputGroup>
  </WorkflowStateForm>
</template>

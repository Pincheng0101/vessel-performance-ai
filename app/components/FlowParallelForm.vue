<script setup>
import { StateConstant } from '~/constants';
import { ParallelNode, ParallelNodeData, ParallelStateDefinition } from '~/models/workflow/state/parallel';

const props = defineProps({
  node: {
    type: ParallelNode,
    required: true,
  },
  usedStateDefinitionNames: {
    type: Array,
    default: () => [],
  },
  onStateFormClose: {
    type: Function,
    default: null,
  },
  onUpdate: {
    type: Function,
    required: true,
  },
});

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {ParallelNode}
   */
  formData: {},
  itemSelector: null,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
}

const {
  createParallelHandler,
  organizeFlow,
} = useWorkflow();

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new ParallelStateDefinition({
    ...state.formData.data.stateDefinition,
  });

  state.formData.data = new ParallelNodeData({
    ...state.formData.data,
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

const createBranch = async () => {
  const parallelHandler = createParallelHandler();
  parallelHandler.createBranch({
    parallelNodeId: props.node.id,
  });
  await organizeFlow();
};

const clearEmptyBranches = async () => {
  const parallelHandler = createParallelHandler();
  parallelHandler.clearEmptyBranches({
    parallelNodeId: props.node.id,
  });
  await organizeFlow();
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title="$t(StateConstant.Type.PARALLEL.i18nTitle)"
    :form-title-icon="StateConstant.Type.PARALLEL.icon"
    :form-title-icon-background="StateConstant.Type.PARALLEL.iconColor"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="update"
    :state-definition="props.node.data.stateDefinition"
  >
    <template #config-fields>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.data.stateDefinition.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.usedStateDefinitionNames, props.node.data.stateDefinition.name)
              .collect()
          )"
          @update:model-value="() => {
            if (props.usedStateDefinitionNames.includes(state.formData.data.stateDefinition.name)) return;
            update();
          }"
        />
      </AppInputGroup>
      <WorkflowNextStateSelect
        v-model="state.formData.data.stateDefinition.next"
        :node="props.node"
        @update:model-value="handleNextStateUpdate"
      />
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldComment')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.data.stateDefinition.comment"
          @update:model-value="update"
        />
      </AppInputGroup>
      <AppButton
        class="mt-4 d-block"
        color="primary"
        :text="$t('__actionAddNewBranch')"
        @click="createBranch"
      />
      <AppButton
        class="mt-4 d-clock"
        :text="$t('__actionClearEmptyBranches')"
        @click="clearEmptyBranches"
      />
    </template>
    <template #input-output-fields>
      <WorkflowStateFormFieldsInputOutput
        v-model:form-data="state.formData.data.stateDefinition.inputOutput"
        :on-update="update"
      />
    </template>
    <template #error-handling-fields>
      <WorkflowStateFormFieldsErrorHandling
        v-model:form-data="state.formData.data.stateDefinition.errorHandling"
        :state-type="StateConstant.Type.PARALLEL.value"
        :state-name="state.formData.data.stateDefinition.name"
        :on-update="update"
      />
    </template>
  </WorkflowStateForm>
</template>

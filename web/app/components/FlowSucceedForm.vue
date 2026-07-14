<script setup>
import { StateConstant } from '~/constants';
import { SucceedNode, SucceedNodeData, SucceedStateDefinition } from '~/models/workflow/state/succeed';

const props = defineProps({
  node: {
    type: SucceedNode,
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
   * @type {SucceedNode}
   */
  formData: {},
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
}

const update = async () => {
  const stateDefinition = new SucceedStateDefinition(state.formData.data.stateDefinition);

  state.formData.data = new SucceedNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.Type.SUCCEED.icon"
    :form-title="$t(StateConstant.Type.SUCCEED.i18nTitle)"
    :form-title-icon-background="StateConstant.Type.SUCCEED.iconColor"
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
    </template>
  </WorkflowStateForm>
</template>

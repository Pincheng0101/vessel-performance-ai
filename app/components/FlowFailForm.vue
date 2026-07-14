<script setup>
import { StateConstant } from '~/constants';
import { FailNode, FailNodeData, FailStateDefinition } from '~/models/workflow/state/fail';

const props = defineProps({
  node: {
    type: FailNode,
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
   * @type {FailNode}
   */
  formData: {},
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
}

const error = computed(() => state.formData.data.stateDefinition.error);
const errorPath = computed(() => state.formData.data.stateDefinition.errorPath);
const cause = computed(() => state.formData.data.stateDefinition.cause);
const causePath = computed(() => state.formData.data.stateDefinition.causePath);

const update = async () => {
  const stateDefinition = new FailStateDefinition({
    ...state.formData.data.stateDefinition,
    error: errorPath.value ? null : error.value,
    errorPath: errorPath.value ? errorPath.value : null,
    cause: causePath.value ? null : cause.value,
    causePath: causePath.value ? causePath.value : null,
  });

  state.formData.data = new FailNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.Type.FAIL.icon"
    :form-title="$t(StateConstant.Type.FAIL.i18nTitle)"
    :form-title-icon-background="StateConstant.Type.FAIL.iconColor"
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
      <StateInputGroup
        v-model="state.formData.data.stateDefinition.error"
        :default-state-input="state.formData.data.stateDefinition.errorPath"
        :label="$t('__fieldError')"
        :tooltip="$t('__tooltipWorkflowFailError')"
        :on-update="(v) => {
          const isStateInput = jsonPathUtils.isJsonPath(v);
          state.formData.data.stateDefinition[isStateInput ? 'errorPath' : 'error'] = v;
          state.formData.data.stateDefinition[isStateInput ? 'error' : 'errorPath'] = '';
          update();
        }"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="state.formData.data.stateDefinition.error"
            @update:model-value="() => {
              state.formData.data.stateDefinition.errorPath = null;
              update();
            }"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-model="state.formData.data.stateDefinition.cause"
        :default-state-input="state.formData.data.stateDefinition.causePath"
        :label="$t('__fieldCause')"
        :tooltip="$t('__tooltipWorkflowFailCause')"
        :on-update="(v) => {
          const isStateInput = jsonPathUtils.isJsonPath(v);
          state.formData.data.stateDefinition[isStateInput ? 'causePath' : 'cause'] = v;
          state.formData.data.stateDefinition[isStateInput ? 'cause' : 'causePath'] = '';
          update();
        }"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="state.formData.data.stateDefinition.cause"
            @update:model-value="() => {
              state.formData.data.stateDefinition.causePath = null;
              update();
            }"
          />
        </template>
      </StateInputGroup>
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

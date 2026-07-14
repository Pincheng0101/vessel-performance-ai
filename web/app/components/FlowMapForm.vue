<script setup>
import { StateConstant } from '~/constants';
import { MapNode, MapNodeData, MapStateDefinition } from '~/models/workflow/state/map';

const props = defineProps({
  node: {
    type: MapNode,
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
   * @type {MapNode}
   */
  formData: {},
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  state.formData.data.stateDefinition.maxConcurrency ??= StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.default;
}

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new MapStateDefinition(state.formData.data.stateDefinition);

  state.formData.data = new MapNodeData({
    ...state.formData.data,
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title="$t(StateConstant.Type.MAP.i18nTitle)"
    :form-title-icon="StateConstant.Type.MAP.icon"
    :form-title-icon-background="StateConstant.Type.MAP.iconColor"
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
        v-slot="{ id, label }"
        :label="$t('__fieldItemsPath')"
      >
        <StateInputCombobox
          :id="id"
          v-model="state.formData.data.stateDefinition.itemsPath"
          :label="label"
          @update:model-value="update"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldItemSelector')"
      >
        <AppJsonEditor
          :id="id"
          v-model:object="state.formData.data.stateDefinition.itemSelector"
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField(label)
              .json()
              .apply('jsonPathBinding')
              .collect()
          )"
          @update:object="update"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldMaxConcurrency')"
        :tooltip="$t('__tooltipWorkflowMapMaxConcurrency')"
      >
        <AppTextField
          :id="id"
          v-model.integer="state.formData.data.stateDefinition.maxConcurrency"
          type="number"
          :min="StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.min"
          :max="StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.max"
          :step="StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.step"
          :rules="(
            $validator
              .defineField(label)
              .gte(StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.min)
              .lte(StateConstant.MapDefaultDefinition.MAX_CONCURRENCY.max)
              .collect()
          )"
          @update:model-value="update"
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
        :state-type="StateConstant.Type.MAP.value"
        :state-name="state.formData.data.stateDefinition.name"
        :on-update="update"
      />
    </template>
  </WorkflowStateForm>
</template>

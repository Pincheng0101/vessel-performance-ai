<script setup>
import { FlowPassConstant, JsonSchemaConstant, StateConstant } from '~/constants';
import { PassDefaultOutput, PassNode, PassNodeData, PassParameters, PassPayload, PassStateDefinition } from '~/models/workflow/state/task/pass';

const props = defineProps({
  node: {
    type: PassNode,
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
   * @type {PassNode}
   */
  formData: {},
  /**
   * @type {PassPayload}
   */
  payload: {},
  abortOnError: false,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new PassPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.PASS.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new PassDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new PassStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new PassParameters({
      payload: new PassPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new PassNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.PASS.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.PASS.i18nTitle) })"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="update"
    :state-definition="props.node.data.stateDefinition"
    executable
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
        v-model="state.payload.parameters"
        :default-value="FlowPassConstant.ActionExecutionParams.PARAMETERS"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldParameter', 2)"
        :tooltip="$t('__tooltipWorkflowActionPassParameter')"
        :on-update="update"
        required
        enable-json-input-switch
        use-json-input
        force-use-json-input
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="state.payload.parameters"
            enable-json-path-binding-linter
            :rules="(
              $validator
                .defineField(label)
                .required()
                .json()
                .apply('jsonPathBinding')
                .collect()
            )"
            @update:object="update"
          />
        </template>
      </StateInputGroup>
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
      <AppFormFieldExpansionPanels>
        <AppFormFieldExpansionPanel :title="$t('__titleExecutionSettings')">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldUploadOutputToExternalMemory')"
            :tooltip="$t('__tooltipWorkflowUseExternalMemoryOutput')"
          >
            <AppSwitch
              :id="id"
              v-model="state.payload.useExternalMemoryOutput"
              @update:model-value="handleUseExternalMemoryOutputChange"
            />
          </AppInputGroup>
          <template v-if="state.payload.useExternalMemoryOutput">
            <StateMemoryOutputSelectorEditor
              v-model:state-memory-output-selector="state.payload.stateMemoryOutputSelector"
              v-model:result-selector="state.formData.data.stateDefinition.inputOutput.resultSelector"
              :on-update="update"
            />
          </template>
          <StreamingConfigFormFields
            v-model="state.payload.streamingConfig"
            :form-data="state.formData"
            :on-update="update"
          />
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldAbortOnError')"
            :tooltip="$t('__tooltipWorkflowActionAbortOnError')"
          >
            <AppSwitch
              :id="id"
              v-model="state.abortOnError"
              @update:model-value="handleAbortOnErrorChange"
            />
          </AppInputGroup>
          <template v-if="!state.abortOnError">
            <StateInputGroup
              v-model="state.payload.defaultOutput"
              :default-value="new PassDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="FlowPassConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="FlowPassConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
                    :on-update="update"
                  />
                </AppInputGroup>
              </template>
            </StateInputGroup>
          </template>
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
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
        :state-name="state.formData.data.stateDefinition.name"
        :on-update="update"
      />
    </template>
  </WorkflowStateForm>
</template>

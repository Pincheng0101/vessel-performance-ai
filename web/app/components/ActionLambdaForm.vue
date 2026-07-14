<script setup>
import { JsonSchemaConstant, LambdaConstant, StateConstant } from '~/constants';
import { LambdaDefaultOutput, LambdaNode, LambdaNodeData, LambdaParameters, LambdaPayload, LambdaStateDefinition } from '~/models/workflow/state/task/lambda';

const props = defineProps({
  node: {
    type: LambdaNode,
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
   * @type {LambdaNode}
   */
  formData: {},
  /**
   * @type {LambdaPayload}
   */
  payload: {},
  abortOnError: false,
  lambdaReferenceMode: LambdaConstant.FunctionReferenceMode.RESOURCE.value,
  lambdaResource: null,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new LambdaPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
  state.lambdaReferenceMode = state.payload.lambdaFunctionId
    ? LambdaConstant.FunctionReferenceMode.RESOURCE.value
    : (state.payload.lambdaFunctionName ? LambdaConstant.FunctionReferenceMode.NAME.value : LambdaConstant.FunctionReferenceMode.RESOURCE.value);
  state.lambdaResource = state.payload.lambdaFunctionId ?? null;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.LAMBDA.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleLambdaReferenceModeChange = () => {
  if (state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value) {
    state.payload.lambdaFunctionName = null;
  } else {
    state.payload.lambdaFunctionId = null;
    state.payload.lambdaFunctionName = null;
    state.lambdaResource = null;
  }
  update();
};

const handleLambdaResourceChange = (v) => {
  if (!v || (objUtils.isObject(v) && v.id)) return;
  state.payload.lambdaFunctionId = v;
  update();
};

watch(() => state.lambdaResource, (v) => {
  if (!v || !objUtils.isObject(v)) return;
  const name = v.name ?? null;
  if (state.payload.lambdaFunctionName === name) return;
  state.payload.lambdaFunctionName = name;
  update();
});

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new LambdaDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new LambdaStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new LambdaParameters({
      payload: new LambdaPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new LambdaNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.LAMBDA.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.LAMBDA.i18nTitle) })"
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
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldLambdaFunctionReference')"
      >
        <AppSelect
          :id="id"
          v-model="state.lambdaReferenceMode"
          :items="Object.values(LambdaConstant.FunctionReferenceMode).map(m => ({ title: $t(m.i18nTitle), icon: m.icon, value: m.value }))"
          @update:model-value="handleLambdaReferenceModeChange"
        />
      </AppInputGroup>
      <template v-if="state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value">
        <ResourceLambdaFunctionPaginatedSelect
          v-model="state.lambdaResource"
          v-model:restored-objects="state.lambdaResource"
          :tooltip="$t('__tooltipLambdaFunctionResource')"
          required
          @update:model-value="handleLambdaResourceChange"
        />
      </template>
      <template v-else-if="state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.NAME.value">
        <StateInputGroup
          v-model="state.payload.lambdaFunctionName"
          :label="$t('__fieldLambdaFunctionName')"
          :tooltip="$t('__tooltipLambdaFunctionName')"
          required
          :on-update="update"
        >
          <template #default="{ id, label }">
            <AppTextField
              :id="id"
              v-model="state.payload.lambdaFunctionName"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              @update:model-value="update"
            />
          </template>
        </StateInputGroup>
      </template>
      <StateInputGroup
        v-model="state.payload.payload"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldPayload')"
        :on-update="update"
        enable-json-input-switch
        use-json-input
        force-use-json-input
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="state.payload.payload"
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
              :default-value="new LambdaDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="LambdaConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="LambdaConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

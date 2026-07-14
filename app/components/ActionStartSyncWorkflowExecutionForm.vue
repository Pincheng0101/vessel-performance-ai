<script setup>
import { ActionExecutionConstant, JsonSchemaConstant, ResourceConstant, StartSyncWorkflowExecutionConstant, StateConstant } from '~/constants';
import { Workflow } from '~/models/server/workflow';
import { StartSyncWorkflowExecutionDefaultOutput, StartSyncWorkflowExecutionNode, StartSyncWorkflowExecutionNodeData, StartSyncWorkflowExecutionParameters, StartSyncWorkflowExecutionPayload, StartSyncWorkflowExecutionStateDefinition } from '~/models/workflow/state/task/startSyncWorkflowExecution';

const props = defineProps({
  node: {
    type: StartSyncWorkflowExecutionNode,
    required: true,
  },
  usedStateDefinitionNames: {
    type: Array,
    default: () => [],
  },
  resources: {
    type: Object,
    default: null,
  },
  onStateFormClose: {
    type: Function,
    default: null,
  },
  onUpdate: {
    type: Function,
    required: true,
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const route = useRoute();

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {StartSyncWorkflowExecutionNode}
   */
  formData: {},
  executionSource: null,
  workflowResource: null,
  abortOnError: false,
});

const workflows = computed(() => props.resources?.[ResourceConstant.Type.WORKFLOW.listKey] || {});
// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new StartSyncWorkflowExecutionPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.executionSource = state.payload.stateMachineArn
    ? ActionExecutionConstant.ExecutionSource.STATE_MACHINE_ARN.value
    : ActionExecutionConstant.ExecutionSource.WORKFLOW_ID.value;
  // For resource select component
  if (state.payload.workflowId) {
    const workflow = workflows.value[state.payload.workflowId];
    if (workflow) {
      state.workflowResource = new Workflow({ workflowId: state.payload.workflowId });
    }
  }
  // Check if the resource is a json path
  if (jsonPathUtils.isJsonPath(state.payload.workflowId)) {
    state.workflowResource = state.payload.workflowId;
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleExecutionSourceChange = () => {
  state.workflowResource = null;
  state.payload.workflowId = null;
  state.payload.stateMachineArn = null;
  update();
};

const handleWorkflowResourceChange = (v) => {
  if (!v) return;
  state.payload.workflowId = jsonPathUtils.isJsonPath(v) ? v : v.id;
  update();
};

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new StartSyncWorkflowExecutionDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new StartSyncWorkflowExecutionStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new StartSyncWorkflowExecutionParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new StartSyncWorkflowExecutionPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new StartSyncWorkflowExecutionNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.i18nTitle) })"
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
        v-slot="{ id, label }"
        :label="$t('__fieldExecutionSource')"
      >
        <AppSelect
          :id="id"
          v-model="state.executionSource"
          :aria-label="$t('__titleSelect', { prefix: label })"
          :items="Object.values(ActionExecutionConstant.ExecutionSource).map(item => ({ ...item, title: $t(item.i18nTitle) }))"
          @update:model-value="handleExecutionSourceChange"
        />
      </AppInputGroup>
      <template v-if="state.executionSource === ActionExecutionConstant.ExecutionSource.WORKFLOW_ID.value">
        <ResourceWorkflowPaginatedSelect
          v-model="state.workflowResource"
          :disable-condition="{
            conditions: [
              { field: 'workflowId', operator: '==', value: route.params.id },
            ],
          }"
          :disabled-tooltip="$t('__tooltipStartWorkflowCannotSelectSelf')"
          enable-state-input-switch
          required
          @update:model-value="handleWorkflowResourceChange"
          @update:restored-objects="props.onResourcesUpdate"
        />
      </template>
      <template v-else>
        <StateInputGroup
          v-model="state.payload.stateMachineArn"
          :label="$t('__fieldStateMachineArn')"
          required
          :on-update="update"
        >
          <template #default="{ id, label }">
            <AppTextField
              :id="id"
              v-model="state.payload.stateMachineArn"
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
        v-model="state.payload.input"
        :default-value="StartSyncWorkflowExecutionConstant.ActionExecutionParams.INPUT"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldInput')"
        :on-update="update"
        enable-json-input-switch
        use-json-input
        force-use-json-input
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="state.payload.input"
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
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldUploadInputToExternalMemory')"
        :tooltip="$t('__tooltipWorkflowUseExternalMemoryInput')"
      >
        <AppSwitch
          :id="id"
          v-model="state.payload.useExternalMemoryInput"
          @update:model-value="(v) => {
            if (!v) {
              state.payload.stateMemoryInputSelector = null;
            }
            update();
          }"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="state.payload.useExternalMemoryInput"
        v-slot="{ id, label }"
        :label="$t('__fieldStateMemoryInputSelector')"
        :tooltip="$t('__tooltipWorkflowStateMemoryInputSelector')"
        :on-update="update"
      >
        <AppJsonEditor
          :id="id"
          v-model:object="state.payload.stateMemoryInputSelector"
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
              :default-value="new StartSyncWorkflowExecutionDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="StartSyncWorkflowExecutionConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="StartSyncWorkflowExecutionConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

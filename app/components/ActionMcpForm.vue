<script setup>
import { JsonSchemaConstant, McpServerConstant, StateConstant } from '~/constants';
import { McpServerTool } from '~/models/server/mcpServer';
import { McpDefaultOutput, McpNode, McpNodeData, McpParameters, McpPayload, McpStateDefinition } from '~/models/workflow/state/task/mcp';

const props = defineProps({
  node: {
    type: McpNode,
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
   * @type {McpNode}
   */
  formData: {},
  /**
   * @type {McpPayload}
   */
  payload: {},
  selectedTool: null,
  restoredMcpServer: null,
  abortOnError: false,
  useStateInputMcpServerId: false,
  useStateInputToolName: false,
  useStateInputInput: false,
  refreshTool: 0,
  refreshInput: 0,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new McpPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
  state.useStateInputMcpServerId = jsonPathUtils.isJsonPath(state.payload.mcpServerId);
  state.useStateInputToolName = jsonPathUtils.isJsonPath(state.payload.toolName);
  state.useStateInputInput = jsonPathUtils.isJsonPath(state.payload.input);
  state.selectedTool = state.useStateInputToolName
    ? state.payload.toolName
    : new McpServerTool({
        name: state.payload.toolName,
      });
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.MCP.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new McpDefaultOutput().removeActionType();
  update();
};

const handleMcpServerChange = (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    state.payload.mcpServerId = v;
    update();
    return;
  }
  state.refreshTool += 1;
  if (!jsonPathUtils.isJsonPath(state.payload.toolName)) {
    state.selectedTool = null;
    state.payload.input = {};
  }
  update();
};

const handleToolChange = (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    state.selectedTool = v;
    update();
    return;
  }
  state.refreshInput += 1;
  if (!jsonPathUtils.isJsonPath(state.payload.input)) {
    state.payload.input = jsonSchemaUtils.generateTemplate(v?.inputSchema);
  }
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new McpStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new McpParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new McpPayload({
        ...state.payload,
        toolName: jsonPathUtils.isJsonPath(state.selectedTool)
          ? state.selectedTool
          : state.selectedTool?.name,
      }),
    }),
  });

  state.formData.data = new McpNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon-path="StateConstant.ActionType.MCP.iconPath"
    :form-title-icon-path-mask-color="StateConstant.ActionType.MCP.iconPathMaskColor"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.MCP.i18nTitle) })"
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
      <ResourceMcpServerPaginatedSelect
        v-model="state.payload.mcpServerId"
        v-model:use-state-input="state.useStateInputMcpServerId"
        v-model:restored-object="state.restoredMcpServer"
        enable-state-input-switch
        required
        aria-label="Select MCP server"
        :return-object="false"
        @update:model-value="handleMcpServerChange"
        @update:use-state-input="(v) => {
          state.useStateInputToolName = v || state.useStateInputToolName;
          state.useStateInputInput = v || state.useStateInputInput;
          // Reset other fields when switching to state input
          if (!jsonPathUtils.isJsonPath(state.selectedTool)) {
            state.selectedTool = '$';
          }
          if (!jsonPathUtils.isJsonPath(state.payload.input)) {
            state.payload.input = '$';
          }
          update();
        }"
      />
      <ResourceMcpServerToolSelect
        v-if="state.payload.mcpServerId"
        :key="`tool-${state.refreshTool}-${state.useStateInputMcpServerId}`"
        v-model="state.selectedTool"
        v-model:use-state-input="state.useStateInputToolName"
        v-model:restored-objects="state.selectedTool"
        :enable-state-input-switch="!state.useStateInputMcpServerId"
        required
        aria-label="Select MCP server tool"
        :mcp-server-id="state.payload.mcpServerId"
        :auth-type="state.restoredMcpServer?.auth?.authType"
        :auth-pending="!state.restoredMcpServer"
        :endpoint-url="state.restoredMcpServer?.endpointUrl"
        :tooltip="$t('__tooltipWorkflowActionMcpServerTool')"
        :disabled="!state.payload.mcpServerId || jsonPathUtils.isJsonPath(state.payload.mcpServerId)"
        @update:model-value="handleToolChange"
        @update:use-state-input="(v) => {
          state.useStateInputInput = v || state.useStateInputInput;
          if (!jsonPathUtils.isJsonPath(state.payload.input)) {
            state.payload.input = '$';
          }
          update();
        }"
      />
      <!-- Refresh the form with key when json schema is updated -->
      <StateInputGroup
        v-if="(state.payload.mcpServerId && state.selectedTool?.inputSchema) || state.useStateInputToolName"
        :key="`input-${state.refreshInput}-${state.useStateInputToolName}`"
        v-model="state.payload.input"
        v-model:use-state-input="state.useStateInputInput"
        :schema="state.selectedTool?.inputSchema"
        :enable-json-input-switch="!state.useStateInputToolName"
        :enable-state-input-switch="!state.useStateInputMcpServerId && !state.useStateInputToolName"
        :expected-value-types="[jsonPathUtils.isJsonPath(state.payload.input) ? JsonSchemaConstant.DataType.STRING.value : JsonSchemaConstant.DataType.OBJECT.value]"
        :strict-json-schema="false"
        :label="$t('__fieldInput')"
        :on-update="update"
      >
        <template #default="{ label }">
          <AppInputGroup bordered>
            <AppJsonSchemaRendererInput
              v-model:form-data="state.payload.input"
              :label="label"
              :schema="state.selectedTool?.inputSchema"
              :on-update="update"
            />
          </AppInputGroup>
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
              :default-value="new McpDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label, useJsonInput }">
                <AppInputGroup :bordered="!useJsonInput">
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="McpServerConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
                    :use-json-input="useJsonInput"
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

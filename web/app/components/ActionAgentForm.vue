<script setup>
import { AgentConstant, JsonSchemaConstant, ListConstant, ResourceConstant, StateConstant } from '~/constants';
import { AgentNode, AgentNodeData, AgentParameters, AgentPayload, AgentStateDefinition } from '~/models/workflow/state/task/agent';

/**
 * @import { Agent } from '~/models/server/agent'
 * @import { Llm } from '~/models/server/llm'
 */

const props = defineProps({
  node: {
    type: AgentNode,
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

const { t } = useI18n();
const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {boolean}
   */
  abortOnError: false,
  /**
   * @type {Agent | string | null}
   */
  agentResource: null,
  /**
   * @type {boolean}
   */
  enableStructuredOutput: false,
  /**
   * @type {AgentNode}
   */
  formData: {},
  /**
   * @type {Llm | string | null}
   */
  llmResource: null,
  /**
   * @type {boolean}
   */
  isPromptRewriting: false,
  /**
   * @type {boolean}
   */
  isPromptVariablesJsonMode: false,
  /**
   * @type {boolean}
   */
  shouldShowPromptPairValidation: false,
  /**
   * @type {AgentPayload}
   */
  payload: {},
  /**
   * @type {Llm | string | null}
   */
  structuredLlmResource: null,
  storageResource: null,
});

const agents = computed(() => props.resources?.[ResourceConstant.Type.AGENT.listKey] || {});
const llms = computed(() => props.resources?.[ResourceConstant.Type.LLM.listKey] || {});
const allowedOverrideLlmIds = computed(() => {
  const llmIds = state.agentResource?.llmIds;
  return Array.isArray(llmIds) ? llmIds : [];
});
const llmFilters = computed(() => {
  if (allowedOverrideLlmIds.value.length < 1) {
    return [{
      field: 'llm_id',
      operator: '=',
      value: '__no_allowed_llm_ids__',
    }];
  }
  return allowedOverrideLlmIds.value.map(llmId => ({
    field: 'llm_id',
    operator: '=',
    value: llmId,
  }));
});

const defaultOutputJsonSchema = computed(() => ({
  ...AgentConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema,
  properties: {
    ...AgentConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema.properties,
    response: referencePathUtils.isReferencePath(state.payload.outputSchema)
      ? AgentConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema.properties.response
      : (state.payload.outputSchema || AgentConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema.properties.response),
  },
}));

const hasPromptOrPromptVariables = computed(() => {
  if (!strUtils.isEmpty(state.payload.prompt)) return true;
  if (referencePathUtils.isReferencePath(state.payload.promptVariables)) return true;
  if (state.payload.promptVariables == null) return false;
  return !objUtils.isEmpty(state.payload.promptVariables);
});

const promptPairErrorMessages = computed(() => (state.shouldShowPromptPairValidation && !hasPromptOrPromptVariables.value) ? [t('__messagePromptOrPromptVariablesRequired')] : null);

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new AgentPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  // For resource select component
  if (state.payload.agentId) {
    const restoredAgent = agents.value[state.payload.agentId];
    if (restoredAgent) {
      state.agentResource = restoredAgent;
    }
  }
  if (referencePathUtils.isReferencePath(state.payload.agentId)) {
    state.agentResource = state.payload.agentId;
  }
  if (state.payload.llmId) {
    const restoredLlm = llms.value[state.payload.llmId];
    if (restoredLlm) {
      state.llmResource = restoredLlm;
    }
  }
  if (referencePathUtils.isReferencePath(state.payload.llmId)) {
    state.llmResource = state.payload.llmId;
  }
  if (state.payload.structuredLlmId) {
    const restoredStructuredLlm = llms.value[state.payload.structuredLlmId];
    if (restoredStructuredLlm) {
      state.structuredLlmResource = restoredStructuredLlm;
    }
  }
  if (referencePathUtils.isReferencePath(state.payload.structuredLlmId)) {
    state.structuredLlmResource = state.payload.structuredLlmId;
  }
  if (!referencePathUtils.isReferencePath(state.payload.promptVariables) && state.payload.promptVariables == null) {
    state.payload.promptVariables = AgentConstant.DefaultParams.PROMPT_VARIABLES.default;
  }
  state.abortOnError = !state.payload.defaultOutput;
  state.enableStructuredOutput = !!state.payload.outputSchema;
  state.isPromptVariablesJsonMode = (
    state.payload.promptVariables != null
    && !referencePathUtils.isReferencePath(state.payload.promptVariables)
    && !objUtils.isObject(state.payload.promptVariables)
  );
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.AGENT.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v
    ? null
    : jsonSchemaUtils.generateTemplate(defaultOutputJsonSchema.value);
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const handleAgentResourceChange = (v) => {
  if (!v) return;
  state.payload.agentId = referencePathUtils.isReferencePath(v) ? v : v.id;
  if (!referencePathUtils.isReferencePath(v)) {
    const allowedIds = Array.isArray(v.llmIds) ? v.llmIds : [];
    if (state.payload.llmId && !allowedIds.includes(state.payload.llmId)) {
      state.payload.llmId = null;
      state.llmResource = null;
    }
  }
  update();
};

const handleLlmResourceChange = (v) => {
  state.payload.llmId = v
    ? (referencePathUtils.isReferencePath(v) ? v : v.id)
    : null;
  update();
};

const handleStructuredLlmResourceChange = (v) => {
  state.payload.structuredLlmId = v
    ? (referencePathUtils.isReferencePath(v) ? v : v.id)
    : null;
  update();
};

const handlePromptVariablesUpdate = (v) => {
  state.payload.promptVariables = referencePathUtils.isReferencePath(v) ? v : (v == null || objUtils.isEmpty(v) ? {} : v);
  update();
};

const handleStructuredOutputChange = (v) => {
  state.enableStructuredOutput = v;
  if (v) {
    state.payload.outputSchema = state.payload.outputSchema || JsonSchemaConstant.Base.DEFAULT_SCHEMA;
  } else {
    state.payload.outputSchema = null;
    state.payload.structuredLlmId = null;
    state.structuredLlmResource = null;
    if (objUtils.isObject(state.payload.defaultOutput)) {
      state.payload.defaultOutput.response = {};
    }
  }
  update();
};

const handleOutputSchemaUpdate = (schema) => {
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.response = {
      ...jsonSchemaUtils.generateTemplate(schema),
      ...(state.payload.defaultOutput.response || {}),
    };
  }
  update();
};

const update = () => {
  const stateDefinition = new AgentStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new AgentParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new AgentPayload(state.payload),
    }),
  });

  state.formData.data = new AgentNodeData({
    stateDefinition,
    isFormGroupValid: isFormGroupValid.value && (!state.shouldShowPromptPairValidation || hasPromptOrPromptVariables.value),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

const validateStateForm = async ({ executable = false } = {}) => {
  if (executable) {
    state.shouldShowPromptPairValidation = true;
    await nextTick();
  }
  const isFormValid = await validateFormGroup();
  const isPairValid = hasPromptOrPromptVariables.value;
  // Cross-field prompt/promptVariables validation is merged here because useWorkflowStateForm only validates form sections
  isFormGroupValid.value = isFormValid && (!state.shouldShowPromptPairValidation || isPairValid);
  update();
  return isFormValid && (!executable || isPairValid);
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.AGENT.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.AGENT.i18nTitle) })"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="validateStateForm"
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
      <ResourceAgentPaginatedSelect
        v-model="state.agentResource"
        v-model:restored-objects="state.agentResource"
        enable-state-input-switch
        required
        @update:model-value="handleAgentResourceChange"
        @update:restored-objects="props.onResourcesUpdate"
      />
      <ReferencePathInputGroup
        v-model="state.payload.prompt"
        :expected-value-types="[JsonSchemaConstant.DataType.STRING.value, JsonSchemaConstant.DataType.NULL.value]"
        :label="$t('__fieldPrompt')"
        :tooltip="$t('__tooltipWorkflowActionCustomPrompt')"
        :json-path-switch-disabled="state.isPromptRewriting"
        :on-update="update"
      >
        <template #default="{ id }">
          <AppJinjaEditor
            :id="id"
            v-model="state.payload.prompt"
            :loading="state.isPromptRewriting"
            :disabled="state.isPromptRewriting"
            :max-lines="12"
            :error-messages="promptPairErrorMessages"
            @update:model-value="update"
          >
            <template #prepend-tools>
              <PromptRewriteButton
                v-model:prompt="state.payload.prompt"
                v-model:loading="state.isPromptRewriting"
                :target-llm-id="state.payload.llmId || state.agentResource?.llmId || null"
                :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
              />
            </template>
          </AppJinjaEditor>
        </template>
      </ReferencePathInputGroup>
      <ReferencePathInputGroup
        v-model="state.payload.promptVariables"
        v-model:use-json="state.isPromptVariablesJsonMode"
        :default-reference-path="AgentConstant.DefaultParams.PROMPT_VARIABLES.default"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value, JsonSchemaConstant.DataType.NULL.value]"
        :label="$t('__fieldPromptVariable', 2)"
        :tooltip="$t('__tooltipWorkflowActionAgentPromptVariables')"
        enable-json-switch
        :on-update="handlePromptVariablesUpdate"
      >
        <template #default>
          <AppKeyValuePairTable
            v-model:object="state.payload.promptVariables"
            :item-label="$t('__fieldTemplateVariable')"
            :key-field-label="$t('__fieldName')"
            :error-messages="promptPairErrorMessages"
            :on-update="update"
          />
        </template>
      </ReferencePathInputGroup>
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
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedActionSettings')">
          <ResourceLlmPaginatedSelect
            v-model="state.llmResource"
            v-model:restored-objects="state.llmResource"
            :allow-create="false"
            :field-name="$t('__fieldLlm')"
            :instruction="$t('__instructionWorkflowActionAgentLlmRequiresAllowedLlmIds')"
            :filter-logic="ListConstant.FilterLogic.OR"
            :filters="llmFilters"
            :tooltip="$t('__tooltipWorkflowActionAgentLlm')"
            enable-state-input-switch
            clearable
            @update:model-value="handleLlmResourceChange"
            @update:restored-objects="props.onResourcesUpdate"
          />
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldSessionId')"
            :tooltip="$t('__tooltipWorkflowActionAgentSessionId')"
          >
            <AppTextField
              :id="id"
              v-model="state.payload.sessionId"
              clearable
              @update:model-value="update"
            />
          </AppInputGroup>
          <ResourceStoragePaginatedSelect
            v-model="state.payload.storageId"
            v-model:restored-objects="state.storageResource"
            :tooltip="$t('__tooltipWorkflowActionAgentStorageId')"
            enable-state-input-switch
            :return-object="false"
            clearable
            @update:model-value="update()"
          />
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldEnableStructuredOutput')"
            :tooltip="$t('__tooltipWorkflowActionAgentStructuredOutput')"
          >
            <AppSwitch
              :id="id"
              v-model="state.enableStructuredOutput"
              @update:model-value="handleStructuredOutputChange"
            />
          </AppInputGroup>
          <template v-if="state.enableStructuredOutput">
            <ReferencePathInputGroup
              v-model="state.payload.outputSchema"
              :default-value="JsonSchemaConstant.Base.DEFAULT_SCHEMA"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldJsonSchema')"
              :schema="JsonSchemaConstant.Base.META_SCHEMA"
              :on-update="update"
              required
              enable-json-switch
            >
              <template #default="{ label }">
                <AppJsonSchemaBuilderInput
                  v-model:form-data="state.payload.outputSchema"
                  :label="label"
                  :rules="(
                    $validator
                      .defineField(label)
                      .required()
                      .collect()
                  )"
                  @update:form-data="handleOutputSchemaUpdate"
                />
              </template>
            </ReferencePathInputGroup>
            <ResourceLlmPaginatedSelect
              v-model="state.structuredLlmResource"
              v-model:restored-objects="state.structuredLlmResource"
              :field-name="$t('__fieldStructuredLlm')"
              :instruction="$t('__instructionResourceLlm')"
              :required="state.enableStructuredOutput"
              enable-state-input-switch
              clearable
              @update:model-value="handleStructuredLlmResourceChange"
              @update:restored-objects="props.onResourcesUpdate"
            />
          </template>
          <StateInputGroup
            v-model="state.payload.maxIterations"
            :default-value="AgentConstant.ActionExecutionParams.MAX_ITERATIONS.default"
            :label="$t('__fieldMaxIterations')"
            :tooltip="$t('__tooltipWorkflowActionAgentMaxIterations')"
            :on-update="update"
          >
            <template #default="{ id, label }">
              <AppTextField
                :id="id"
                v-model.integer="state.payload.maxIterations"
                type="number"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .when({
                      gte: !jsonPathUtils.isJsonPath(state.payload.maxIterations),
                      lte: !jsonPathUtils.isJsonPath(state.payload.maxIterations),
                    })
                    .gte(AgentConstant.ActionExecutionParams.MAX_ITERATIONS.min)
                    .lte(AgentConstant.ActionExecutionParams.MAX_ITERATIONS.max)
                    .collect()
                )"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.wsIdleTimeout"
            :default-value="AgentConstant.ActionExecutionParams.WS_IDLE_TIMEOUT.default"
            :label="$t('__fieldWsIdleTimeout')"
            :tooltip="$t('__tooltipWorkflowActionAgentWsIdleTimeout')"
            :on-update="update"
          >
            <template #default="{ id, label }">
              <AppTextField
                :id="id"
                v-model.integer="state.payload.wsIdleTimeout"
                type="number"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .when({
                      gte: !jsonPathUtils.isJsonPath(state.payload.wsIdleTimeout),
                      lte: !jsonPathUtils.isJsonPath(state.payload.wsIdleTimeout),
                    })
                    .gte(AgentConstant.ActionExecutionParams.WS_IDLE_TIMEOUT.min)
                    .lte(AgentConstant.ActionExecutionParams.WS_IDLE_TIMEOUT.max)
                    .collect()
                )"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
        </AppFormFieldExpansionPanel>
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
            <ReferencePathInputGroup
              v-model="state.payload.defaultOutput"
              :default-value="jsonSchemaUtils.generateTemplate(defaultOutputJsonSchema)"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="defaultOutputJsonSchema"
              :on-update="update"
              enable-json-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    :key="JSON.stringify(state.payload.outputSchema || {})"
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="defaultOutputJsonSchema"
                    :validate-with-schema="!referencePathUtils.isReferencePath(defaultOutputJsonSchema.properties.response)"
                    :on-update="update"
                  />
                </AppInputGroup>
              </template>
            </ReferencePathInputGroup>
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

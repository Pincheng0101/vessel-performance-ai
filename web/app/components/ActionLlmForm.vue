<script setup>
import { ActionExecutionConstant, LlmConstant, ResourceConstant, StateConstant } from '~/constants';
import { Llm, LlmActionExecutionPayload, LlmActionExecutionPayloadFactory } from '~/models/server/llm';
import { MessageActionExecutionPayload } from '~/models/server/message';
import { RetryActionExecutionPayload } from '~/models/server/retry';
import { LlmDefaultOutput, LlmNode, LlmNodeData, LlmParameters, LlmPayload, LlmStateDefinition } from '~/models/workflow/state/task/llm';

const props = defineProps({
  node: {
    type: LlmNode,
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

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();
const { translateObj } = useCustomLocale();

const state = reactive({
  /**
   * @type {LlmNode}
   */
  formData: {},
  /**
   * @type {LlmPayload}
   */
  payload: {},
  /**
   * @type {ReturnType<typeof LlmFactory.create>}
   */
  llmResource: null,
  retry: false,
  abortOnError: false,
});

const llms = computed(() => props.resources?.[ResourceConstant.Type.LLM.listKey] || {});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new LlmPayload({
    ...payload,
    llm: LlmActionExecutionPayloadFactory.create({
      ...payload.llm,
      // Add the default messages with translations and backward compatibility fallback
      messages: payload.llm.messages?.length > 0
        ? payload.llm.messages
        : (payload.llm.content?.length > 0
            ? [new MessageActionExecutionPayload({ content: payload.llm.content, role: LlmConstant.MessageRole.USER.value })]
            : translateObj(LlmConstant.ActionExecutionParams.MESSAGES)),
    }),
  });
  // Remove fields to prevent manual modification if a default output is specified
  if (state.payload.defaultOutput instanceof LlmDefaultOutput) {
    state.payload.defaultOutput.removeActionType();
  }
  // For resource select component
  if (state.payload.llm.llmId) {
    const restoredLlm = llms.value[state.payload.llm.llmId];
    if (restoredLlm) {
      state.llmResource = restoredLlm;
    }
  }
  // Check if the resource is a reference path
  if (referencePathUtils.isReferencePath(state.payload.llm)) {
    state.llmResource = state.payload.llm;
  }
  // Restore the model because it is not defined in the payload
  if (state.llmResource instanceof Llm) {
    state.payload.llm.model = state.llmResource.model;
    state.payload.llm.region = state.llmResource.region;
  }
  // Convert null to empty string to prevent displaying "null" text
  if (strUtils.isEmpty(state.payload.llm.systemPrompt)) {
    state.payload.llm.systemPrompt = '';
  }
  state.retry = !!state.payload.retry;
  state.abortOnError = !state.payload.defaultOutput;
}

const handleLlmResourceChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncPayloadWithLlmResource(v);
};

/**
 * @param {Llm} v
 */
const syncPayloadWithLlmResource = (v) => {
  if (!v) return;

  if (referencePathUtils.isReferencePath(v)) {
    state.payload = new LlmPayload({
      ...state.payload,
      llm: v,
    });
    update();
    return;
  }

  const llm = LlmActionExecutionPayloadFactory.create({
    ...state.payload.llm,
    ...v,
  });
  // Override with the selected resource
  state.payload = new LlmPayload({
    ...state.payload,
    llm,
  });
  // Restore the model because it is not defined in the payload
  if (state.payload.llm instanceof LlmActionExecutionPayload) {
    state.payload.llm.model = v.model;
    state.payload.llm.region = v.region;
  }
  update();
};

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.LLM.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new LlmDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const llm = (() => {
    if (!state.llmResource) return {};
    if (!(state.llmResource instanceof Llm)) return state.llmResource;
    return LlmActionExecutionPayloadFactory.create({
      ...state.payload.llm,
      llmId: state.llmResource.id,
      llmType: state.llmResource.type,
      systemPrompt: strUtils.isEmpty(state.payload.llm.systemPrompt) ? null : state.payload.llm.systemPrompt,
    });
  })();

  const retry = state.retry
    ? new RetryActionExecutionPayload({
        attempts: ActionExecutionConstant.RetryParams.ATTEMPTS.default,
        temperatureDiff: ActionExecutionConstant.RetryParams.TEMPERATURE_DIFF.default,
      })
    : null;

  const stateDefinition = new LlmStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new LlmParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new LlmPayload({
        ...state.payload,
        llm,
        retry,
      }),
    }),
  });

  state.formData.data = new LlmNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

const migrateContentToMessages = async () => {
  const { content, messages } = state.payload.llm;
  if (content.length > 0) {
    if (messages.length === 0) {
      state.payload.llm.messages = [
        {
          role: LlmConstant.MessageRole.USER.value,
          content,
        },
      ];
    }
    delete state.payload.llm.content;
    await delay(500);
    update();
  }
};

onMounted(async () => {
  await migrateContentToMessages();
});
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.LLM.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.LLM.i18nTitle) })"
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
      <!-- Bind "restored-objects" to apply the default value -->
      <ResourceLlmPaginatedSelect
        v-model="state.llmResource"
        v-model:restored-objects="state.llmResource"
        enable-state-input-switch
        required
        @update:model-value="handleLlmResourceChange"
        @update:restored-objects="(v) => {
          if (!v) return;
          syncPayloadWithLlmResource(v);
          if (objUtils.isObject(v) && v.id) {
            props.onResourcesUpdate(v);
          }
        }"
      >
        <template #append>
          <WorkflowModal :target="form">
            <template #activator="{ toggle }">
              <template v-if="state.payload.llm.llmId">
                <AppIconButton
                  icon="mdi-tune"
                  variant="text"
                  aria-label="Tune LLM"
                  @click.stop="toggle"
                />
              </template>
            </template>
            <template #body="{ onCancel }">
              <WorkflowModalCard
                :title="`${$t('__actionConfigure')} ${state.llmResource.llmName}`"
                :on-cancel="onCancel"
              >
                <template #body>
                  <ResourceLlmFormFields
                    :key="state.llmResource.id"
                    v-model:form-data="state.payload.llm"
                    :resource="state.llmResource"
                    :hidden-fields="['llmName', 'llmType', 'apiKey', 'endpointUrl', 'region', 'crossRegionInference', 'model', 'credentialType', 'effort']"
                    :on-update="update"
                    input-layout="narrow"
                    enable-state-input-switch
                  />
                </template>
              </WorkflowModalCard>
            </template>
          </WorkflowModal>
        </template>
      </ResourceLlmPaginatedSelect>
      <template v-if="(state.llmResource instanceof Llm)">
        <ReferencePathInputGroup
          v-model="state.payload.llm.messages"
          :default-value="translateObj(LlmConstant.ActionExecutionParams.MESSAGES)"
          :label="$t('__fieldMessage', 2)"
          :tooltip="$t('__tooltipWorkflowActionMessages')"
          :on-update="update"
          required
        >
          <template #default="{ label }">
            <LlmMessageTable
              v-model="state.payload.llm.messages"
              :llm-type="state.payload.llm.llmType"
              :llm-id="state.payload.llm.llmId"
              :aria-label="label"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              @update:model-value="update"
            />
          </template>
        </ReferencePathInputGroup>
      </template>
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
          <template v-if="(state.llmResource instanceof Llm)">
            <ReferencePathInputGroup
              v-model="state.payload.llm.guardrailId"
              :label="$t('__fieldGuardrailId')"
              :tooltip="$t('__tooltipWorkflowActionGuardrailId')"
              :on-update="update"
            >
              <template #default="{ id }">
                <AppTextField
                  :id="id"
                  v-model="state.payload.llm.guardrailId"
                  @update:model-value="update"
                />
              </template>
            </ReferencePathInputGroup>
            <ReferencePathInputGroup
              v-model="state.payload.llm.guardrailVersion"
              :default-value="LlmConstant.ActionExecutionParams.GUARDRAILS.version"
              :label="$t('__fieldGuardrailVersion')"
              :tooltip="$t('__tooltipWorkflowActionGuardrailVersion')"
              :on-update="update"
            >
              <template #default="{ id }">
                <AppTextField
                  :id="id"
                  v-model="state.payload.llm.guardrailVersion"
                  @update:model-value="update"
                />
              </template>
            </ReferencePathInputGroup>
            <ReferencePathInputGroup
              v-model="state.payload.fallbackLlms"
              :label="$t('__fieldLlmFallbackLlm', 2)"
              :tooltip="$t('__tooltipWorkflowActionLlmFallbackLlms')"
              :on-update="update"
            >
              <template #default="{ label }">
                <LlmFallbackLlmTable
                  v-model="state.payload.fallbackLlms"
                  :aria-label="label"
                  :resources="llms"
                  :messages="state.payload.llm.messages"
                  :hidden-fields="['jsonSchema']"
                  :on-resources-update="props.onResourcesUpdate"
                  @update:model-value="update"
                />
              </template>
            </ReferencePathInputGroup>
          </template>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldAllowRetry')"
            :tooltip="$t('__tooltipWorkflowActionRetry')"
          >
            <AppSwitch
              :id="id"
              v-model="state.retry"
              @update:model-value="update"
            />
          </AppInputGroup>
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
              :default-value="new LlmDefaultOutput().removeActionType()"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="LlmConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="LlmConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

<script setup>
import { ConnectorConstant, JsonSchemaConstant, ReadUrlConstant, StateConstant } from '~/constants';
import { ReadUrlDefaultOutput, ReadUrlNode, ReadUrlNodeData, ReadUrlParameters, ReadUrlPayload, ReadUrlStateDefinition } from '~/models/workflow/state/task/readUrl';

const props = defineProps({
  node: {
    type: ReadUrlNode,
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
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {ReadUrlNode}
   */
  formData: {},
  /**
   * @type {ReadUrlPayload}
   */
  payload: {},
  abortOnError: false,
  connectorResource: null,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new ReadUrlPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.READ_URL.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new ReadUrlDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new ReadUrlStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new ReadUrlParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new ReadUrlPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new ReadUrlNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.READ_URL.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.READ_URL.i18nTitle) })"
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
        v-model="state.payload.url"
        :default-value="ReadUrlConstant.ActionExecutionParams.URL"
        :label="$t('__fieldUrl')"
        :tooltip="$t('__tooltipWorkflowActionReadUrlUrl')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model="state.payload.url"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .httpOrHttps()
                .url()
                .collect()
            )"
            @update:model-value="update"
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
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedActionSettings')">
          <ResourceConnectorPaginatedSelect
            v-model="state.payload.connectorId"
            v-model:restored-objects="state.connectorResource"
            :filters="[
              { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value },
            ]"
            :return-object="false"
            enable-state-input-switch
            clearable
            :tooltip="$t('__tooltipWorkflowActionConnector')"
            @update:model-value="update"
            @update:restored-objects="props.onResourcesUpdate"
          />
          <StateInputGroup
            v-model="state.payload.headers"
            :default-value="ReadUrlConstant.ActionExecutionParams.HEADERS"
            :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
            :label="$t('__fieldHttpHeader', 2)"
            :tooltip="$t('__tooltipWorkflowActionHttpHeader')"
            :on-update="update"
            enable-json-input-switch
          >
            <template #default="{ label }">
              <AppHttpHeaderTable
                v-model:object="state.payload.headers"
                :aria-label="label"
                :on-update="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.format"
            :default-value="ReadUrlConstant.ActionExecutionParams.FORMAT"
            :label="$t('__fieldFormat')"
            :tooltip="$t('__tooltipWorkflowActionReadUrlFormat')"
            :on-update="update"
          >
            <template #default="{ id }">
              <AppSelect
                :id="id"
                v-model="state.payload.format"
                :items="Object.values(ReadUrlConstant.Format).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.limit"
            :default-value="ReadUrlConstant.ActionExecutionParams.LIMIT.default"
            :label="$t('__fieldWordLimit')"
            :tooltip="$t('__tooltipWorkflowActionWordLimit')"
            :on-update="update"
          >
            <template #default="{ id, label }">
              <AppTextField
                :id="id"
                v-model.integer="state.payload.limit"
                type="number"
                clearable
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      gte: state.payload.limit,
                    })
                    .gte(ReadUrlConstant.ActionExecutionParams.LIMIT.min)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (strUtils.isEmpty(v)) {
                    state.payload.limit = null;
                  }
                  update();
                }"
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
            <StateInputGroup
              v-model="state.payload.defaultOutput"
              :default-value="new ReadUrlDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="ReadUrlConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="ReadUrlConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

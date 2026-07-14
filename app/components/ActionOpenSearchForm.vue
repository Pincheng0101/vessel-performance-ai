<script setup>
import { ConnectorConstant, HttpConstant, JsonSchemaConstant, OpenSearchConstant, StateConstant } from '~/constants';
import { OpenSearchDefaultOutput, OpenSearchNode, OpenSearchNodeData, OpenSearchParameters, OpenSearchPayload, OpenSearchStateDefinition } from '~/models/workflow/state/task/opensearch';

/**
 * @import { Connector } from '~/models/server/connector'
 */

const props = defineProps({
  node: {
    type: OpenSearchNode,
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
   * @type {OpenSearchNode}
   */
  formData: {},
  /**
   * @type {OpenSearchPayload}
   */
  payload: {},
  abortOnError: false,
  connectorResource: null,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new OpenSearchPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.OPENSEARCH.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new OpenSearchDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new OpenSearchStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new OpenSearchParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new OpenSearchPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new OpenSearchNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon-path="StateConstant.ActionType.OPENSEARCH.iconPath"
    :form-title-icon-path-mask-color="StateConstant.ActionType.OPENSEARCH.iconPathMaskColor"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.OPENSEARCH.i18nTitle) })"
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
      <ResourceConnectorPaginatedSelect
        v-model="state.payload.connectorId"
        :filters="[
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.OPENSEARCH.value },
        ]"
        :return-object="false"
        enable-state-input-switch
        required
        :tooltip="$t('__tooltipWorkflowActionConnector')"
        @update:model-value="update"
        @update:restored-objects="props.onResourcesUpdate"
      />
      <StateInputGroup
        v-model="state.payload.method"
        :default-value="HttpConstant.Method.GET.value"
        :label="$t('__fieldMethod')"
        :tooltip="$t('__tooltipWorkflowActionOpenSearchMethod')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppSelect
            :id="id"
            v-model="state.payload.method"
            :items="Object.values(HttpConstant.Method)"
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
      <StateInputGroup
        v-model="state.payload.urlPath"
        :default-value="OpenSearchConstant.ActionExecutionParams.URL_PATH"
        :label="$t('__fieldUrlPath')"
        :tooltip="$t('__tooltipWorkflowActionOpenSearchUrlPath')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model="state.payload.urlPath"
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
      <StateInputGroup
        v-model="state.payload.body"
        :default-value="OpenSearchConstant.ActionExecutionParams.BODY"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldBody')"
        :tooltip="$t('__tooltipWorkflowActionOpenSearchBody')"
        :on-update="update"
        enable-json-input-switch
        use-json-input
        force-use-json-input
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="state.payload.body"
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
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedActionSettings')">
          <StateInputGroup
            v-model="state.payload.headers"
            :default-value="OpenSearchConstant.ActionExecutionParams.HEADERS"
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
            v-model="state.payload.params"
            :default-value="OpenSearchConstant.ActionExecutionParams.PARAMS"
            :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
            :label="$t('__fieldParameter', 2)"
            :tooltip="$t('__tooltipWorkflowActionOpenSearchParams')"
            :on-update="update"
            enable-json-input-switch
          >
            <template #default="{ label }">
              <AppOpenSearchParameterTable
                v-model:object="state.payload.params"
                :aria-label="label"
                :url-path="state.payload.urlPath"
                :on-update="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.isCacheConnection"
            :default-value="OpenSearchConstant.ActionExecutionParams.IS_CACHE_CONNECTION"
            :expected-value-types="[JsonSchemaConstant.DataType.BOOLEAN.value]"
            :label="$t('__fieldIsCacheConnection', 2)"
            :tooltip="$t('__tooltipOpenSearchIsCacheConnection')"
            :on-update="update"
          >
            <template #default="{ label }">
              <AppSwitch
                :id="label"
                v-model="state.payload.isCacheConnection"
                :aria-label="label"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.timeout"
            :default-value="OpenSearchConstant.ActionExecutionParams.TIMEOUT"
            :expected-value-types="[JsonSchemaConstant.DataType.NUMBER.value]"
            :label="$t('__fieldTimeout', 2)"
            :tooltip="$t('__tooltipWorkflowActionTimeout')"
            :on-update="update"
          >
            <template #default="{ label }">
              <AppTextField
                :id="label"
                v-model.integer="state.payload.timeout"
                type="number"
                :min="OpenSearchConstant.DefaultParams.TIMEOUT.min"
                :max="OpenSearchConstant.DefaultParams.TIMEOUT.max"
                :step="OpenSearchConstant.DefaultParams.TIMEOUT.step"
                :aria-label="label"
                :rules="(
                  $validator
                    .defineField(label)
                    .gte(OpenSearchConstant.DefaultParams.TIMEOUT.min)
                    .lte(OpenSearchConstant.DefaultParams.TIMEOUT.max)
                    .collect()
                )"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
        </AppFormFieldExpansionPanel>
        <AppFormFieldExpansionPanel :title="$t('__titleExecutionSettings')">
          <StateInputGroup
            v-model="state.payload.useExternalMemoryOutput"
            :label="$t('__fieldUploadOutputToExternalMemory')"
            :tooltip="$t('__tooltipWorkflowUseExternalMemoryOutput')"
            :on-update="update"
          >
            <template #default="{ id }">
              <AppSwitch
                :id="id"
                v-model="state.payload.useExternalMemoryOutput"
                @update:model-value="handleUseExternalMemoryOutputChange"
              />
            </template>
          </StateInputGroup>
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
              :default-value="new OpenSearchDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="OpenSearchConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="OpenSearchConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

<script setup>
import { ConnectorConstant, HttpConstant, HttpsApiConstant, JsonSchemaConstant, StateConstant } from '~/constants';
import { HttpsApiDefaultOutput, HttpsApiNode, HttpsApiNodeData, HttpsApiParameters, HttpsApiPayload, HttpsApiStateDefinition } from '~/models/workflow/state/task/httpsApi';

/**
 * @import { HttpConnector } from '~/models/server/connector'
 */

const props = defineProps({
  node: {
    type: HttpsApiNode,
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
   * @type {HttpsApiNode}
   */
  formData: {},
  /**
   * @type {HttpsApiPayload}
   */
  payload: {},
  /**
   * @type {HttpConnector|null}
   */
  connectorResource: null,
  abortOnError: false,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new HttpsApiPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.HTTPS_API.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new HttpsApiDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new HttpsApiStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new HttpsApiParameters({
      payload: new HttpsApiPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new HttpsApiNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.HTTPS_API.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.HTTPS_API.i18nTitle) })"
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
        v-model="state.payload.method"
        :default-value="HttpConstant.Method.GET.value"
        :label="$t('__fieldMethod')"
        :tooltip="$t('__tooltipHttpMethod')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppSelect
            :id="id"
            v-model="state.payload.method"
            :items="Object.values(HttpConstant.Method).map(m => ({
              title: m.title,
              value: m.value,
            }))"
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
      <ResourceConnectorPaginatedSelect
        v-model="state.payload.connectorId"
        v-model:restored-objects="state.connectorResource"
        :filters="[
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value },
        ]"
        :return-object="false"
        enable-state-input-switch
        clearable
        :tooltip="$t('__tooltipHttpConnector')"
        @update:model-value="update"
      />
      <StateInputGroup
        v-model="state.payload.url"
        :default-value="HttpsApiConstant.ActionExecutionParams.URL"
        :label="$t('__fieldUrl')"
        :tooltip="$t('__tooltipHttpUrl')"
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
                .https()
                .url()
                .collect()
            )"
            @update:model-value="update"
          />
        </template>
      </StateInputGroup>
      <ReferencePathInputGroup
        v-model="state.payload.params"
        :default-value="HttpsApiConstant.ActionExecutionParams.PARAMS"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldParameter', 2)"
        :tooltip="$t('__tooltipHttpParams')"
        :on-update="update"
        enable-json-switch
      >
        <template #default>
          <AppKeyValuePairTable
            v-model:object="state.payload.params"
            :item-label="$t('__fieldParameter')"
            :key-field-label="$t('__fieldName')"
            :on-update="update"
          />
        </template>
      </ReferencePathInputGroup>
      <ReferencePathInputGroup
        v-model="state.payload.body"
        :default-value="HttpsApiConstant.ActionExecutionParams.BODY"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldBody')"
        :tooltip="$t('__tooltipHttpBody')"
        :on-update="update"
        enable-json-switch
      >
        <template #default>
          <AppKeyValuePairTable
            v-model:object="state.payload.body"
            :item-label="$t('__fieldField')"
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
          <StateInputGroup
            v-model="state.payload.headers"
            :default-value="HttpsApiConstant.ActionExecutionParams.HEADERS"
            :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
            :label="$t('__fieldHttpHeader', 2)"
            :tooltip="$t('__tooltipWorkflowActionHttpHeaderMergeWithConnector')"
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
              :default-value="new HttpsApiDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="HttpsApiConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="HttpsApiConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

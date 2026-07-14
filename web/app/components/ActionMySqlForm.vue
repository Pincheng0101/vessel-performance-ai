<script setup>
import { ConnectorConstant, JsonSchemaConstant, MySqlConstant, StateConstant } from '~/constants';
import { MySqlDefaultOutput, MySqlNode, MySqlNodeData, MySqlParameters, MySqlPayload, MySqlStateDefinition } from '~/models/workflow/state/task/mysql';

/**
 * @import { Connector } from '~/models/server/connector'
 */

const props = defineProps({
  node: {
    type: MySqlNode,
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
const { extractSqlTemplateParameters } = useTemplateVariable();

const state = reactive({
  /**
   * @type {MySqlNode}
   */
  formData: {},
  /**
   * @type {MySqlPayload}
   */
  payload: {},
  abortOnError: false,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new MySqlPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.MYSQL.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new MySqlDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new MySqlStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new MySqlParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new MySqlPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new MySqlNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon-path="StateConstant.ActionType.MYSQL.iconPath"
    :form-title-icon-path-mask-color="StateConstant.ActionType.MYSQL.iconPathMaskColor"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.MYSQL.i18nTitle) })"
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
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.MYSQL.value },
        ]"
        :return-object="false"
        enable-state-input-switch
        required
        @update:model-value="update"
        @update:restored-objects="props.onResourcesUpdate"
      />
      <StateInputGroup
        v-model="state.payload.database"
        :label="$t('__fieldDatabase')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model="state.payload.database"
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
        v-model="state.payload.query"
        :label="$t('__fieldSqlQuery')"
        :tooltip="$t('__tooltipWorkflowActionSqlQuery')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppMySqlEditor
            :id="id"
            v-model="state.payload.query"
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
      <ReferencePathInputGroup
        v-model="state.payload.args"
        :default-value="MySqlConstant.ActionExecutionParams.ARGS"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldSqlParameter', 2)"
        :tooltip="$t('__tooltipWorkflowActionSqlParameters')"
        :on-update="update"
        enable-json-switch
      >
        <template #default="{ label }">
          <AppSqlParameterTable
            v-model="state.payload.args"
            :aria-label="label"
            :key-options="extractSqlTemplateParameters(state.payload.query)"
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
              :default-value="new MySqlDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="MySqlConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="MySqlConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

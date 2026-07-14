<script setup>
import { AthenaConstant, ConnectorConstant, JsonSchemaConstant, StateConstant } from '~/constants';
import { AthenaDefaultOutput, AthenaNode, AthenaNodeData, AthenaParameters, AthenaPayload, AthenaStateDefinition } from '~/models/workflow/state/task/athena';

/**
 * @import { Connector } from '~/models/server/connector'
 */

const props = defineProps({
  node: {
    type: AthenaNode,
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
   * @type {AthenaNode}
   */
  formData: {},
  /**
   * @type {AthenaPayload}
   */
  payload: {},
  abortOnError: false,
  executionSettingType: null,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new AthenaPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
  if (state.payload.workgroup) {
    state.executionSettingType = AthenaConstant.ExecutionSettingType.WORKGROUP.value;
  }
  if (state.payload.outputLocation) {
    state.executionSettingType = AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value;
  }
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.ATHENA.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new AthenaDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const handleExecutionSettingTypeChange = () => {
  state.payload.workgroup = null;
  state.payload.outputLocation = null;
  update();
};

const update = async () => {
  const stateDefinition = new AthenaStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new AthenaParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new AthenaPayload({
        ...state.payload,
        outputLocation: state.executionSettingType === AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value ? state.payload.outputLocation : null,
        workgroup: state.executionSettingType === AthenaConstant.ExecutionSettingType.WORKGROUP.value ? state.payload.workgroup : null,
      }),
    }),
  });

  state.formData.data = new AthenaNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon-path="StateConstant.ActionType.ATHENA.iconPath"
    :form-title-icon-path-mask-color="StateConstant.ActionType.ATHENA.iconPathMaskColor"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.ATHENA.i18nTitle) })"
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
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.AWS.value },
        ]"
        :return-object="false"
        enable-state-input-switch
        required
        :tooltip="$t('__tooltipAgentAthenaConnector')"
        @update:model-value="update"
        @update:restored-objects="props.onResourcesUpdate"
      />
      <StateInputGroup
        v-model="state.payload.query"
        :default-value="AthenaConstant.DefaultParams.QUERY"
        :label="$t('__fieldSqlQuery')"
        :tooltip="$t('__tooltipWorkflowActionSqlQuery')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppMySqlEditor
            :id="id"
            v-model="state.payload.query"
            :dialog-title="$t('__titleEditorAthena')"
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
        v-model="state.payload.database"
        :label="$t('__fieldDatabase')"
        :tooltip="$t('__tooltipAgentAthenaDatabase')"
        :on-update="update"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="state.payload.database"
            clearable
            @update:model-value="update"
          />
        </template>
      </StateInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldAthenaExecutionSettingType')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.executionSettingType"
          :items="Object.values(AthenaConstant.ExecutionSettingType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="handleExecutionSettingTypeChange"
        />
      </AppInputGroup>
      <template v-if="state.executionSettingType === AthenaConstant.ExecutionSettingType.WORKGROUP.value">
        <StateInputGroup
          v-model="state.payload.workgroup"
          :label="$t('__fieldWorkgroup')"
          :tooltip="$t('__tooltipAgentAthenaWorkgroup')"
          :on-update="update"
          required
        >
          <template #default="{ id, label }">
            <AppTextField
              :id="id"
              v-model="state.payload.workgroup"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              clearable
              @update:model-value="update"
            />
          </template>
        </StateInputGroup>
      </template>
      <template v-else-if="state.executionSettingType === AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value">
        <StateInputGroup
          v-model="state.payload.outputLocation"
          :label="$t('__fieldOutputLocation')"
          :tooltip="$t('__tooltipAgentAthenaOutputLocation')"
          :on-update="update"
          required
        >
          <template #default="{ id, label }">
            <AppTextField
              :id="id"
              v-model="state.payload.outputLocation"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .startsWith('s3://')
                  .collect()
              )"
              clearable
              @update:model-value="update"
            />
          </template>
        </StateInputGroup>
      </template>
      <StateInputGroup
        v-model="state.payload.catalog"
        :label="$t('__fieldCatalog')"
        :tooltip="$t('__tooltipAgentAthenaCatalog')"
        :on-update="update"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="state.payload.catalog"
            clearable
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
          <StateInputGroup
            v-model="state.payload.readOnly"
            :default-value="AthenaConstant.DefaultParams.READ_ONLY"
            :expected-value-types="[JsonSchemaConstant.DataType.BOOLEAN.value]"
            :label="$t('__fieldReadOnly')"
            :tooltip="$t('__tooltipAgentAthenaReadOnly')"
            :on-update="update"
          >
            <template #default="{ label }">
              <AppSwitch
                :id="label"
                v-model="state.payload.readOnly"
                :aria-label="label"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.maxRows"
            :default-value="AthenaConstant.DefaultParams.MAX_ROWS.default"
            :expected-value-types="[JsonSchemaConstant.DataType.INTEGER.value]"
            :label="$t('__fieldMaxRows')"
            :tooltip="$t('__tooltipWorkflowActionAthenaMaxRows')"
            :on-update="update"
          >
            <template #default="{ label }">
              <AppTextField
                :id="label"
                v-model.integer="state.payload.maxRows"
                type="number"
                :min="AthenaConstant.DefaultParams.MAX_ROWS.min"
                :max="AthenaConstant.DefaultParams.MAX_ROWS.max"
                :step="AthenaConstant.DefaultParams.MAX_ROWS.step"
                :aria-label="label"
                :rules="(
                  $validator
                    .defineField(label)
                    .gte(AthenaConstant.DefaultParams.MAX_ROWS.min)
                    .lte(AthenaConstant.DefaultParams.MAX_ROWS.max)
                    .collect()
                )"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <StateInputGroup
            v-model="state.payload.waitTimeout"
            :default-value="AthenaConstant.DefaultParams.WAIT_TIMEOUT.default"
            :expected-value-types="[JsonSchemaConstant.DataType.INTEGER.value]"
            :label="$t('__fieldWaitTimeout')"
            :tooltip="$t('__tooltipWorkflowActionTimeout')"
            :on-update="update"
          >
            <template #default="{ label }">
              <AppTextField
                :id="label"
                v-model.integer="state.payload.waitTimeout"
                type="number"
                :min="AthenaConstant.DefaultParams.WAIT_TIMEOUT.min"
                :max="AthenaConstant.DefaultParams.WAIT_TIMEOUT.max"
                :step="AthenaConstant.DefaultParams.WAIT_TIMEOUT.step"
                :aria-label="label"
                :rules="(
                  $validator
                    .defineField(label)
                    .gte(AthenaConstant.DefaultParams.WAIT_TIMEOUT.min)
                    .lte(AthenaConstant.DefaultParams.WAIT_TIMEOUT.max)
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
              :default-value="new AthenaDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="AthenaConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="AthenaConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

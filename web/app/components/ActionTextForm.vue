<script setup>
import { JsonSchemaConstant, StateConstant, TextConstant } from '~/constants';
import { TextDefaultOutput, TextNode, TextNodeData, TextParameters, TextPayload, TextStateDefinition } from '~/models/workflow/state/task/text';

const props = defineProps({
  node: {
    type: TextNode,
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
const { extractJinjaTemplateVariables } = useTemplateVariable();

const state = reactive({
  /**
   * @type {TextNode}
   */
  formData: {},
  /**
   * @type {TextPayload}
   */
  payload: {},
  abortOnError: false,
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new TextPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.TEXT.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new TextDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new TextStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new TextParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new TextPayload({
        ...state.payload,
      }),
    }),
  });

  state.formData.data = new TextNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.TEXT.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.TEXT.i18nTitle) })"
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
        v-model="state.payload.template"
        :default-value="TextConstant.ActionExecutionParams.TEMPLATE"
        :label="$t('__fieldTemplate')"
        :tooltip="$t('__tooltipWorkflowActionCustomTemplate')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppJinjaEditor
            :id="id"
            v-model="state.payload.template"
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
        v-model="state.payload.variables"
        :default-value="TextConstant.ActionExecutionParams.VARIABLES"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldTemplateVariable', 2)"
        :tooltip="$t('__tooltipWorkflowActionTemplateVariable')"
        :on-update="update"
        enable-json-switch
      >
        <template #default="{ label }">
          <AppJinjaVariableTable
            v-model="state.payload.variables"
            :aria-label="label"
            :key-options="extractJinjaTemplateVariables(state.payload.template)"
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
              :default-value="new TextDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="TextConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="TextConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

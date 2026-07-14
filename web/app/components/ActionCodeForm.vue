<script setup>
import { CodeConstant, JsonSchemaConstant, StateConstant } from '~/constants';
import { CodeDefaultOutput, CodeNode, CodeNodeData, CodeParameters, CodePayload, CodeRuntime, CodeStateDefinition } from '~/models/workflow/state/task/code';

const props = defineProps({
  node: {
    type: CodeNode,
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
const { t } = useI18n();
const authStore = useAuthStore();

const state = reactive({
  /**
   * @type {CodeNode}
   */
  formData: {},
  /**
   * @type {CodePayload}
   */
  payload: {},
  abortOnError: false,
  isCodeGenerating: false,
});

const isAdmin = computed(() => !!authStore.parsedToken?.isAdmin);

const runtimeTypeOptions = computed(() => Object.values(CodeConstant.RuntimeTypes)
  .filter(runtimeType => !(runtimeType.adminOnly && !isAdmin.value))
  .map(runtimeType => ({
    ...runtimeType,
    title: t(runtimeType.i18nTitle),
    subtitle: t(runtimeType.i18nSubtitle),
  })));

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new CodePayload(payload);
  state.payload.runtime ??= new CodeRuntime({
    code: CodeConstant.ActionExecutionParams.CODE,
    data: CodeConstant.ActionExecutionParams.DATA,
  });
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
}

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.CODE.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new CodeDefaultOutput().removeActionType();
  update();
};

const handleRuntimeTypeChange = (runtimeType) => {
  state.payload.runtime = new CodeRuntime({
    ...state.payload.runtime,
    runtimeType,
  });
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new CodeStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new CodeParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new CodePayload({
        ...state.payload,
        runtime: new CodeRuntime(state.payload.runtime),
      }),
    }),
  });

  state.formData.data = new CodeNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.CODE.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.CODE.i18nTitle) })"
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
        v-model="state.payload.runtime.runtimeType"
        :expected-value-types="[JsonSchemaConstant.DataType.STRING.value]"
        :label="$t('__fieldCodeRuntimeType')"
        :tooltip="$t('__tooltipCodeRuntimeType')"
        :on-update="update"
        required
      >
        <template #default="{ id, label }">
          <AppSelect
            :id="id"
            v-model="state.payload.runtime.runtimeType"
            :items="runtimeTypeOptions"
            :disabled="state.isCodeGenerating"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            @update:model-value="handleRuntimeTypeChange"
          />
        </template>
      </StateInputGroup>
      <ActionCodeFormFieldsRuntime
        v-if="state.payload.runtime.runtimeType"
        v-model:runtime="state.payload.runtime"
        v-model:is-generating="state.isCodeGenerating"
        :loading-text="$t('__actionGeneratingCode', { mode: t(findField(CodeConstant.RuntimeTypes, state.payload.runtime.runtimeType, 'i18nTitle')) })"
        :on-update="update"
      />
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
              :default-value="new CodeDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="CodeConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="CodeConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

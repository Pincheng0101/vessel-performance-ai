<script setup>
import { JsonSchemaConstant, ResourceConstant, SearchEngineConstant, StateConstant } from '~/constants';
import { SearchEngineActionExecutionPayloadFactory } from '~/models/server/searchEngine';
import { SearchEngineDefaultOutput, SearchEngineNode, SearchEngineNodeData, SearchEngineParameters, SearchEnginePayload, SearchEngineStateDefinition } from '~/models/workflow/state/task/searchEngine';

/**
 * @import { SearchEngine, SearchEngineFactory } from '~/models/server/searchEngine'
 */

const props = defineProps({
  node: {
    type: SearchEngineNode,
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

const state = reactive({
  /**
   * @type {SearchEngineNode}
   */
  formData: {},
  /**
   * @type {SearchEnginePayload}
   */
  payload: {},
  /**
   * @type {ReturnType<typeof SearchEngineFactory.create>}
   */
  searchEngineResource: null,
  abortOnError: false,
  useJsonSchema: false,
});

const searchEngines = computed(() => props.resources?.[ResourceConstant.Type.SEARCH_ENGINE.listKey] || {});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.useJsonSchema = !!payload.searchEngine.jsonSchema;
  state.payload = new SearchEnginePayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  // For resource select component
  if (state.payload.searchEngine.searchEngineId) {
    const restoredSearchEngine = searchEngines.value[state.payload.searchEngine.searchEngineId];
    if (restoredSearchEngine) {
      state.searchEngineResource = restoredSearchEngine;
    }
  }
  // Check if the resource is a json path
  if (jsonPathUtils.isJsonPath(state.payload.searchEngine)) {
    state.searchEngineResource = state.payload.searchEngine;
  }
  // Restore the model because it is not defined in the payload
  if (objUtils.isObject(state.searchEngineResource)) {
    state.payload.searchEngine.model = state.searchEngineResource.model;
  }
  // Convert null to empty string to prevent displaying "null" text
  if (strUtils.isEmpty(state.payload.searchEngine?.systemPrompt)) {
    state.payload.searchEngine.systemPrompt = '';
  }
  state.abortOnError = !state.payload.defaultOutput;
}

/**
 * @param {SearchEngine} v
 */
const handleSearchEngineResourceChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncPayloadWithSearchEngineResource(v);
};

const syncPayloadWithSearchEngineResource = (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    state.payload.searchEngine = v;
    update();
    return;
  }
  // Override with the selected resource
  state.payload.searchEngine = SearchEngineActionExecutionPayloadFactory.create({
    ...state.payload.searchEngine,
    ...v,
  });
  // Restore the model because it is not defined in the payload
  state.payload.searchEngine.model = v.model;
  update();
};

const handleUseJsonSchemaChange = (v) => {
  state.payload.searchEngine.jsonSchema = v ? JsonSchemaConstant.Base.DEFAULT_SCHEMA : null;
  update();
};

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.SEARCH_ENGINE.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v
    ? null
    : new SearchEngineDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const searchEngine = (() => {
    if (!state.searchEngineResource) return {};
    if (jsonPathUtils.isJsonPath(state.searchEngineResource)) return state.searchEngineResource;
    return SearchEngineActionExecutionPayloadFactory.create({
      ...state.payload.searchEngine,
      searchEngineId: state.searchEngineResource.id,
      searchEngineType: state.searchEngineResource.type,
      systemPrompt: strUtils.isEmpty(state.payload.searchEngine?.systemPrompt) ? null : state.payload.searchEngine.systemPrompt,
    });
  })();

  const stateDefinition = new SearchEngineStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new SearchEngineParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new SearchEnginePayload({
        ...state.payload,
        searchEngine,
      }),
    }),
  });

  state.formData.data = new SearchEngineNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.SEARCH_ENGINE.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.SEARCH_ENGINE.i18nTitle) })"
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
      <ResourceSearchEnginePaginatedSelect
        v-model="state.searchEngineResource"
        enable-state-input-switch
        required
        @update:model-value="handleSearchEngineResourceChange"
        @update:restored-objects="(v) => {
          if (!v) return;
          syncPayloadWithSearchEngineResource(v);
          if (objUtils.isObject(v) && v.id) {
            props.onResourcesUpdate(v);
          }
        }"
      >
        <template #append>
          <WorkflowModal :target="form">
            <template #activator="{ toggle }">
              <template v-if="state.payload.searchEngine.searchEngineId">
                <AppIconButton
                  icon="mdi-tune"
                  variant="text"
                  aria-label="Tune Search Engine"
                  @click.stop="toggle"
                />
              </template>
            </template>
            <template #body="{ onCancel }">
              <WorkflowModalCard
                :title="`${$t('__actionConfigure')} ${state.searchEngineResource.searchEngineName}`"
                :on-cancel="onCancel"
              >
                <template #body>
                  <ResourceSearchEngineFormFields
                    :key="state.searchEngineResource.id"
                    v-model:form-data="state.payload.searchEngine"
                    :resource="state.searchEngineResource"
                    :hidden-fields="['searchEngineName', 'searchEngineType', 'apiKey', 'cx', 'model']"
                    :on-update="update"
                    input-layout="narrow"
                    enable-state-input-switch
                  />
                </template>
              </WorkflowModalCard>
            </template>
          </WorkflowModal>
        </template>
      </ResourceSearchEnginePaginatedSelect>
      <template v-if="!jsonPathUtils.isJsonPath(state.searchEngineResource) && objUtils.isObject(state.searchEngineResource)">
        <template v-if="state.payload.searchEngine.searchEngineType">
          <QueryTemplateFormFields
            v-model:query-string="state.payload.searchEngine.queryString"
            v-model:query-template="state.payload.searchEngine.queryTemplate"
            :on-update="update"
            :on-resources-update="props.onResourcesUpdate"
          />
        </template>
        <template v-if="state.payload.searchEngine.searchEngineType === SearchEngineConstant.Type.GOOGLE.value">
          <StateInputGroup
            v-model="state.payload.searchEngine.compactMode"
            :default-value="SearchEngineConstant.ActionExecutionParams.GOOGLE_COMPACT_MODE"
            :label="$t('__fieldCompactMode')"
            :on-update="update"
          >
            <template #default="{ id }">
              <AppSwitch
                :id="id"
                v-model="state.payload.searchEngine.compactMode"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
        </template>
        <template v-if="state.payload.searchEngine.searchEngineType === SearchEngineConstant.Type.PERPLEXITY.value">
          <StateInputGroup
            v-model="state.payload.searchEngine.outputTextIncludesCitation"
            :default-value="SearchEngineConstant.ActionExecutionParams.PERPLEXITY_OUTPUT_TEXT_INCLUDES_CITATION"
            :label="$t('__fieldOutputTextIncludesCitation')"
            :tooltip="$t('__tooltipResourceSearchEnginePerplexityOutputTextIncludesCitation')"
            :on-update="update"
          >
            <template #default="{ id }">
              <AppSwitch
                :id="id"
                v-model="state.payload.searchEngine.outputTextIncludesCitation"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldUseJsonSchema')"
            :tooltip="$t('__tooltipResourceSearchEnginePerplexityUseJsonSchema')"
          >
            <AppSwitch
              :id="id"
              v-model="state.useJsonSchema"
              @update:model-value="handleUseJsonSchemaChange"
            />
          </AppInputGroup>
          <template v-if="state.useJsonSchema">
            <StateInputGroup
              v-model="state.payload.searchEngine.jsonSchema"
              :default-value="JsonSchemaConstant.Base.DEFAULT_SCHEMA"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldJsonSchema')"
              :on-update="update"
              required
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppJsonSchemaBuilderInput
                  v-model:form-data="state.payload.searchEngine.jsonSchema"
                  :label="label"
                  :rules="(
                    $validator
                      .defineField(label)
                      .required()
                      .collect()
                  )"
                  @update:form-data="update"
                />
              </template>
            </StateInputGroup>
          </template>
        </template>
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
        <template
          v-if="
            !jsonPathUtils.isJsonPath(state.searchEngineResource)
              && objUtils.isObject(state.searchEngineResource)
              && [
                SearchEngineConstant.Type.DUCKDUCKGO.value,
                SearchEngineConstant.Type.GOOGLE.value,
                SearchEngineConstant.Type.PERPLEXITY.value,
              ].includes(state.payload.searchEngine.searchEngineType)
          "
        >
          <AppFormFieldExpansionPanel :title="$t('__titleAdvancedActionSettings')">
            <StateInputGroup
              v-model="state.payload.searchEngine.limit"
              :default-value="SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.default"
              :label="$t('__fieldLimitOfDocuments')"
              :tooltip="$t('__tooltipWorkflowActionLimitOfDocuments')"
              :on-update="update"
            >
              <template #default="{ id }">
                <AppSlider
                  :id="id"
                  v-model="state.payload.searchEngine.limit"
                  layout="narrow"
                  :min="SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.min"
                  :max="SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.max"
                  :step="SearchEngineConstant.ActionExecutionParams.SEARCH_ENGINE_LIMIT.step"
                  @update:model-value="update"
                />
              </template>
            </StateInputGroup>
          </AppFormFieldExpansionPanel>
        </template>
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
              :default-value="new SearchEngineDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="SearchEngineConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="SearchEngineConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

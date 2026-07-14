<script setup>
import { JsonSchemaConstant, RankerConstant, ResourceConstant, RetrievalConstant, StateConstant } from '~/constants';
import { RankerActionExecutionPayloadFactory } from '~/models/server/ranker';
import { RetrieverActionExecutionPayloadFactory } from '~/models/server/retriever';
import { RetrievalDefaultOutput, RetrievalNode, RetrievalNodeData, RetrievalParameters, RetrievalPayload, RetrievalStateDefinition } from '~/models/workflow/state/task/retrieval';

/**
 * @import { Ranker, RankerFactory } from '~/models/server/ranker'
 */

const props = defineProps({
  node: {
    type: RetrievalNode,
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
   * @type {RetrievalNode}
   */
  formData: {},
  /**
   * @type {RetrievalPayload}
   */
  payload: {},
  /**
   * @type {ReturnType<typeof RankerFactory.create>}
   */
  rankerResource: null,
  abortOnError: false,
});

const rankers = computed(() => props.resources?.[ResourceConstant.Type.RANKER.listKey] || {});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { payload } = state.formData.data.stateDefinition.parameters;
  state.payload = new RetrievalPayload(payload);
  // Remove fields to prevent manual modification if a default output is specified
  if (objUtils.isObject(state.payload.defaultOutput)) {
    state.payload.defaultOutput.removeActionType();
  }
  state.abortOnError = !state.payload.defaultOutput;
  // For resource select component
  if (state.payload.ranker.rankerId) {
    const restoredRanker = rankers.value[state.payload.ranker.rankerId];
    if (restoredRanker) {
      state.rankerResource = restoredRanker;
    }
  }
  // Check if the resource is a json path
  if (jsonPathUtils.isJsonPath(state.payload.ranker)) {
    state.rankerResource = state.payload.ranker;
  }
}

/**
 * @param {Ranker} v
 */
const handleRankerResourceChange = (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    update();
    return;
  }
  // Override with the selected resource
  state.payload.ranker = RankerActionExecutionPayloadFactory.create({
    ...state.payload.ranker,
    ...v,
  });
  update();
};

const handleUseExternalMemoryOutputChange = (v) => {
  state.formData.data.stateDefinition.inputOutput.resultSelector = v
    ? StateConstant.UseExternalMemoryResultSelector
    : StateConstant.ActionType.RETRIEVER.defaultInputOutput.resultSelector;
  if (!v) {
    state.payload.stateMemoryOutputSelector = null;
  }
  update();
};

const handleAbortOnErrorChange = (v) => {
  state.payload.defaultOutput = v ? null : new RetrievalDefaultOutput().removeActionType();
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const retrievers = jsonPathUtils.isJsonPath(state.payload.retrievers)
    ? state.payload.retrievers
    : state.payload.retrievers.map(RetrieverActionExecutionPayloadFactory.create);

  const ranker = (() => {
    if (!state.rankerResource) return {};
    if (jsonPathUtils.isJsonPath(state.rankerResource)) return state.rankerResource;
    return RankerActionExecutionPayloadFactory.create({
      ...state.payload.ranker,
      contentTemplate: state.payload.ranker.contentTemplate,
      rankerId: state.rankerResource.id,
      rankerType: state.rankerResource.type,
      rankingFields: state.payload.ranker.rankingFields,
    });
  })();

  const stateDefinition = new RetrievalStateDefinition({
    ...state.formData.data.stateDefinition,
    parameters: new RetrievalParameters({
      ...state.formData.data.stateDefinition.parameters,
      payload: new RetrievalPayload({
        ...state.payload,
        ranker,
        retrievers,
      }),
    }),
  });

  state.formData.data = new RetrievalNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.ActionType.RETRIEVAL.icon"
    :form-title="$t('__workflowAction', { action: $t(StateConstant.ActionType.RETRIEVAL.i18nTitle) })"
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
        v-model="state.payload.retrievers"
        :label="$t('__fieldRetriever', 2)"
        required
        :on-update="update"
      >
        <template #default="{ label }">
          <ActionRetrieverPayloadTable
            v-model="state.payload.retrievers"
            :aria-label="label"
            :resources="props.resources"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            :on-resources-update="props.onResourcesUpdate"
            @update:model-value="update"
          />
        </template>
      </StateInputGroup>
      <ResourceRankerPaginatedSelect
        v-model="state.rankerResource"
        enable-state-input-switch
        clearable
        @update:model-value="handleRankerResourceChange"
        @update:restored-objects="props.onResourcesUpdate"
      />
      <template v-if="state.payload.ranker.rankerId && !jsonPathUtils.isJsonPath(state.rankerResource) && objUtils.isObject(state.rankerResource)">
        <AppInputGroup
          :label="$t('__fieldRankerSetting', 2)"
          bordered
        >
          <QueryTemplateFormFields
            v-model:query-string="state.payload.ranker.queryString"
            v-model:query-template="state.payload.ranker.queryTemplate"
            :on-update="update"
            :on-resources-update="props.onResourcesUpdate"
          />
          <template
            v-if="[
              RankerConstant.Type.JACCARD_SIMILARITY.value,
              RankerConstant.Type.COHERE.value,
              RankerConstant.Type.AMAZON.value,
            ].includes(state.payload.ranker.rankerType)"
          >
            <StateInputGroup
              v-model="state.payload.ranker.rankingFields"
              :label="$t('__fieldRankingField', 2)"
              :required="state.payload.ranker.rankerType !== RankerConstant.Type.COHERE.value"
              :on-update="update"
            >
              <template #default="{ id, label }">
                <AppCombobox
                  :id="id"
                  v-model="state.payload.ranker.rankingFields"
                  :rules="(
                    $validator
                      .defineField(label)
                      .requiredWhen(state.payload.ranker.rankerType !== RankerConstant.Type.COHERE.value)
                      .collect()
                  )"
                  @update:model-value="update"
                />
              </template>
            </StateInputGroup>
          </template>
          <template
            v-if="[
              RankerConstant.Type.EMBEDDING.value,
            ].includes(state.payload.ranker.rankerType)"
          >
            <StateInputGroup
              v-model="state.payload.ranker.contentTemplate"
              :label="$t('__fieldContentTemplate')"
              required
              :on-update="update"
            >
              <template #default="{ id, label }">
                <AppJinjaEditor
                  :id="id"
                  v-model="state.payload.ranker.contentTemplate"
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
          </template>
          <StateInputGroup
            v-model="state.payload.ranker.limit"
            :default-value="RankerConstant.ActionExecutionParams.RANKER_LIMIT.default"
            :label="$t('__fieldLimitOfDocuments')"
            :tooltip="$t('__tooltipWorkflowActionLimitOfDocuments')"
            :on-update="update"
          >
            <template #default="{ id, label }">
              <AppTextField
                :id="id"
                v-model.integer="state.payload.ranker.limit"
                type="number"
                :min="RankerConstant.ActionExecutionParams.RANKER_LIMIT.min"
                :max="RankerConstant.ActionExecutionParams.RANKER_LIMIT.max"
                :step="RankerConstant.ActionExecutionParams.RANKER_LIMIT.step"
                :rules="(
                  $validator
                    .defineField(label)
                    .gte(RankerConstant.ActionExecutionParams.RANKER_LIMIT.min)
                    .lte(RankerConstant.ActionExecutionParams.RANKER_LIMIT.max)
                    .collect()
                )"
                @update:model-value="update"
              />
            </template>
          </StateInputGroup>
          <template
            v-if="[
              RankerConstant.Type.JACCARD_SIMILARITY.value,
              RankerConstant.Type.EMBEDDING.value,
            ].includes(state.payload.ranker.rankerType)"
          >
            <StateInputGroup
              v-model="state.payload.ranker.threshold"
              :default-value="RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.default"
              :label="$t('__fieldRelevanceThreshold')"
              :tooltip="$t('__tooltipWorkflowActionThreshold')"
              :on-update="update"
            >
              <template #default="{ id }">
                <AppSlider
                  :id="id"
                  v-model="state.payload.ranker.threshold"
                  layout="narrow"
                  :min="RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.min"
                  :max="RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.max"
                  :step="RankerConstant.ActionExecutionParams.RANKER_THRESHOLD.step"
                  @update:model-value="update"
                />
              </template>
            </StateInputGroup>
          </template>
        </AppInputGroup>
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
              :default-value="new RetrievalDefaultOutput().removeActionType()"
              :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
              :label="$t('__fieldDefaultOutput')"
              :tooltip="$t('__tooltipWorkflowActionDefaultOutput')"
              :schema="RetrievalConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
              :on-update="update"
              enable-json-input-switch
            >
              <template #default="{ label }">
                <AppInputGroup bordered>
                  <AppJsonSchemaRendererInput
                    v-model:form-data="state.payload.defaultOutput"
                    :label="label"
                    :schema="RetrievalConstant.ActionExecutionParams.DEFAULT_OUTPUT.jsonSchema"
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

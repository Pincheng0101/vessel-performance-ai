<script setup>
import { KnowledgeBaseConstant, ResourceConstant, RetrieverConstant } from '~/constants';
import { RetrieverActionExecutionPayloadFactory } from '~/models/server/retriever';

/**
 * @import { RetrieverFactory, Retriever } from '~/models/server/retriever'
 * @import { KnowledgeBase, KnowledgeBaseFactory } from '~/models/server/knowledgeBase'
 */

const props = defineProps({
  resources: {
    type: Object,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<Retriever>}
 */
const formData = defineModel('formData', {
  type: [String, Object],
  default: {},
});

const server = useServer();

const state = reactive({
  /**
   * @type {ReturnType<typeof RetrieverFactory.create>}
   */
  retrieverResource: null,
  /**
   * @type {ReturnType<typeof KnowledgeBaseFactory.create>}
   */
  knowledgeBaseResource: null,
  /**
   * @type {EmbeddingModel}
   */
  embeddingModelResource: null,
});

const knowledgeBases = computed(() => props.resources?.[ResourceConstant.Type.KNOWLEDGE_BASE.listKey] || {});
const retrievers = computed(() => props.resources?.[ResourceConstant.Type.RETRIEVER.listKey] || {});

const getRetrieverId = retriever => retriever?.id || retriever?.retrieverId;
const getRetrieverType = retriever => retriever?.type || retriever?.retrieverType;

const getHybridSearchRetrieverSettings = (retriever) => {
  if (!objUtils.isObject(retriever) || getRetrieverType(retriever) !== RetrieverConstant.Type.HYBRID_SEARCH.value) return {};
  return {
    keywordWeight: retriever.keywordWeight ?? RetrieverConstant.HybridSearchParams.KEYWORD_WEIGHT.default,
    embeddingWeight: retriever.embeddingWeight ?? RetrieverConstant.HybridSearchParams.EMBEDDING_WEIGHT.default,
    normalizationTechnique: retriever.normalizationTechnique ?? RetrieverConstant.HybridSearchParams.NORMALIZATION_TECHNIQUE.default,
    combinationTechnique: retriever.combinationTechnique ?? RetrieverConstant.HybridSearchParams.COMBINATION_TECHNIQUE.default,
  };
};

const initializeHybridSearchSettings = (retriever) => {
  const settings = getHybridSearchRetrieverSettings(retriever);
  if (objUtils.isEmpty(settings)) return;

  formData.value.keywordWeight = formData.value.keywordWeight ?? settings.keywordWeight;
  formData.value.embeddingWeight = formData.value.embeddingWeight ?? settings.embeddingWeight;
  formData.value.normalizationTechnique = formData.value.normalizationTechnique ?? settings.normalizationTechnique;
  formData.value.combinationTechnique = formData.value.combinationTechnique ?? settings.combinationTechnique;
};

const shouldSyncRestoredRetrieverResource = (v) => {
  if (!objUtils.isObject(v) || !getRetrieverId(v)) return !!v;
  if (
    !formData.value.retrieverId
    || formData.value.retrieverId !== getRetrieverId(v)
    || !formData.value.retrieverType
  ) {
    return true;
  }
  return getRetrieverType(v) === RetrieverConstant.Type.EMBEDDING.value
    && !!v.embeddingModelId
    && formData.value.embedding?.embeddingModelId !== v.embeddingModelId;
};

const initializeState = () => {
  if (formData.value.knowledgeBaseId) {
    const restoredKnowledgeBase = knowledgeBases.value[formData.value.knowledgeBaseId];
    if (restoredKnowledgeBase) {
      state.knowledgeBaseResource = restoredKnowledgeBase;
    } else {
      state.knowledgeBaseResource = { knowledgeBaseId: formData.value.knowledgeBaseId };
    }
  }
  if (jsonPathUtils.isJsonPath(formData.value.knowledgeBaseId)) {
    state.knowledgeBaseResource = formData.value.knowledgeBaseId;
  }
  if (formData.value.retrieverId) {
    const restoredRetriever = retrievers.value[formData.value.retrieverId];
    if (restoredRetriever) {
      state.retrieverResource = restoredRetriever;
      initializeHybridSearchSettings(restoredRetriever);
    } else {
      state.retrieverResource = {
        retrieverId: formData.value.retrieverId,
        retrieverType: formData.value.retrieverType,
      };
    }
  }
  if (jsonPathUtils.isJsonPath(formData.value)) {
    state.retrieverResource = formData.value;
  }
};

initializeState();

/**
 * @param {KnowledgeBase} v
 */
const handleKnowledgeBaseResourceChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncFormDataWithKnowledgeBaseResource(v);
};

const syncFormDataWithKnowledgeBaseResource = (v) => {
  if (!v) return;
  // Override with the selected resource
  formData.value = RetrieverActionExecutionPayloadFactory.create({
    ...formData.value,
    knowledgeBaseId: jsonPathUtils.isJsonPath(v) ? v : v.id,
  });
  props.onUpdate();
};

/**
 * @param {Retriever} v
 */
const handleRetrieverResourceChange = async (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  await syncFormDataWithRetrieverResource(v);
};

const syncFormDataWithRetrieverResource = async (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    formData.value = v;
    // Clear all selected values from the resource select components
    state.knowledgeBaseResource = null;
    props.onUpdate();
    return;
  }
  // Override with the selected resource
  formData.value = RetrieverActionExecutionPayloadFactory.create({
    ...formData.value,
    ...v,
    ...getHybridSearchRetrieverSettings(v),
  });
  // Fetch embedding model for embedding retriever
  if (v.type === RetrieverConstant.Type.EMBEDDING.value && v.embeddingModelId) {
    const { data } = await server.embeddingModel.get({
      embeddingModelId: v.embeddingModelId,
    });
    state.embeddingModelResource = data.value;
    formData.value = {
      ...formData.value,
      embedding: state.embeddingModelResource,
    };
  }
  // Wait for the re-rendered ActionRetrieverFormFields components
  // to finish restoring the objects before triggering the update
  await delay(1000);
  props.onUpdate();
};
</script>

<template>
  <ResourceRetrieverPaginatedSelect
    v-model="state.retrieverResource"
    required
    @update:model-value="handleRetrieverResourceChange"
    @update:restored-objects="async (v) => {
      if (!v) return;
      if (objUtils.isObject(v) && v.id) {
        props.onResourcesUpdate(v);
      }
      if (!shouldSyncRestoredRetrieverResource(v)) {
        state.retrieverResource = v;
        initializeHybridSearchSettings(v);
        return;
      }
      await syncFormDataWithRetrieverResource(v);
    }"
  />
  <template v-if="!jsonPathUtils.isJsonPath(state.retrieverResource) && objUtils.isObject(state.retrieverResource)">
    <ResourceKnowledgeBasePaginatedSelect
      v-model="state.knowledgeBaseResource"
      :filters="[{ field: 'knowledge_base_type', operator: '=', value: KnowledgeBaseConstant.Type.VECTOR_STORE.value }]"
      enable-state-input-switch
      required
      @update:model-value="handleKnowledgeBaseResourceChange"
      @update:restored-objects="(v) => {
        if (!v) return;
        syncFormDataWithKnowledgeBaseResource(v);
        if (objUtils.isObject(v) && v.id) {
          props.onResourcesUpdate(v);
        }
      }"
    />
  </template>
  <template v-if="!jsonPathUtils.isJsonPath(state.retrieverResource) && objUtils.isObject(state.retrieverResource)">
    <template v-if="state.retrieverResource.type === RetrieverConstant.Type.EMBEDDING.value">
      <ActionRetrieverFormFieldsEmbedding
        v-model:query-string="formData.queryString"
        v-model:query-template="formData.queryTemplate"
        :on-update="props.onUpdate"
        :on-resources-update="props.onResourcesUpdate"
      />
    </template>
    <template v-else-if="state.retrieverResource.type === RetrieverConstant.Type.KEYWORD.value">
      <ActionRetrieverFormFieldsKeyword
        v-model:query-strings="formData.queryStrings"
        v-model:search-query="formData.searchQuery"
        :on-update="props.onUpdate"
      />
    </template>
    <template v-else-if="state.retrieverResource.type === RetrieverConstant.Type.HYBRID_SEARCH.value">
      <ActionRetrieverFormFieldsHybridSearch
        v-model:query-strings="formData.queryStrings"
        :on-update="props.onUpdate"
      />
    </template>
  </template>
</template>

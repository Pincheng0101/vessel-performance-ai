import { FeatureConstant, KnowledgeBaseConstant, LoaderConstant, ResourceConstant, RetrieverConstant, StateConstant } from '~/constants';

export function useFeature() {
  const featureStore = useFeatureStore();

  const isFetchingFeatures = ref(false);

  const initFeatures = async () => {
    if (featureStore.features.length > 0) return;
    const server = useServer();
    isFetchingFeatures.value = true;
    const { data, error } = await server.feature.list({}, {
      lazy: false,
    });
    if (error.value) {
      featureStore.setFeatures([]);
      isFetchingFeatures.value = false;
      return;
    }
    featureStore.setFeatures(data.value.data);
    isFetchingFeatures.value = false;
  };

  /**
   * Returns an array of type that should be disabled based on their required features.
   *
   * Iterates over the provided types, checks if any required feature for each type is disabled
   * in the feature store.
   *
   * @param {Object} types - An object containing type definitions. Each type should have a `requiredFeatures` array and a `value` property.
   * @returns {Array} Array of type that are disabled due to missing required features.
   */
  const getDisabledTypes = (types) => {
    return Object.values(types)
      .filter((type) => {
        return type.requiredFeatures?.some((featureName) => {
          return featureStore.isFeatureDisabled(featureName);
        });
      });
  };

  const disabledResourceTypes = computed(() => getDisabledTypes(ResourceConstant.Type));

  const isChunkerDisabled = computed(() => disabledResourceTypes.value.some(type => type.value === ResourceConstant.Type.CHUNKER.value));

  const isKnowledgeBaseDisabled = computed(() => disabledResourceTypes.value.some(type => type.value === ResourceConstant.Type.KNOWLEDGE_BASE.value));

  const isLoaderDisabled = computed(() => disabledResourceTypes.value.some(type => type.value === ResourceConstant.Type.LOADER.value));

  const isRetrieverDisabled = computed(() => disabledResourceTypes.value.some(type => type.value === ResourceConstant.Type.RETRIEVER.value));

  const disabledKnowledgeBaseTypes = computed(() => getDisabledTypes(KnowledgeBaseConstant.Type));

  const disabledLoaderTypes = computed(() => getDisabledTypes(LoaderConstant.Type));

  const disabledRetrieverTypes = computed(() => getDisabledTypes(RetrieverConstant.Type));

  const disabledNodeTypes = computed(() => getDisabledTypes(StateConstant.ActionType));

  const isWebSocketApiDisabled = computed(() => featureStore.isFeatureDisabled(FeatureConstant.Name.LAMBDA_FUNCTION_WEBSOCKET_API));

  const isAdminChatSessionViewDisabled = computed(() => featureStore.isFeatureDisabled(FeatureConstant.Name.LAMBDA_FUNCTION_API_ADMIN_CHAT_SESSION_VIEW));

  return {
    disabledKnowledgeBaseTypes,
    disabledLoaderTypes,
    disabledNodeTypes,
    disabledResourceTypes,
    disabledRetrieverTypes,
    initFeatures,
    isAdminChatSessionViewDisabled,
    isChunkerDisabled,
    isKnowledgeBaseDisabled,
    isLoaderDisabled,
    isRetrieverDisabled,
    isWebSocketApiDisabled,
  };
}

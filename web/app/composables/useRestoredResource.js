import { ListConstant } from '~/constants';

export function useRestoredResource({
  resourceType,
  keyField,
  pageSize = 200,
} = {}) {
  const server = useServer();

  const resourceMap = ref({});
  const restoredResources = ref([]);
  const isLoading = ref(false);

  const buildFilterConditions = (ids) => {
    return ids.map(id => id
      ? ({
          field: strUtils.toSnakeCase(keyField),
          operator: '=',
          value: id,
        })
      : null).filter(Boolean);
  };

  const fetchResources = async (resourceIds) => {
    if (!resourceIds || resourceIds.length === 0) {
      return [];
    }
    const filterConditions = buildFilterConditions(resourceIds);
    if (!filterConditions || filterConditions?.length === 0) {
      return;
    }
    const result = [];
    let nextToken = null;
    do {
      const { data, error } = await server[resourceType].list({
        nextToken,
        limit: pageSize,
        filterLogic: ListConstant.FilterLogic.OR,
        filters: filterConditions,
      }, {
        lazy: false,
      });
      if (error.value) {
        return result;
      }
      const resources = data.value?.data || [];
      result.push(...resources);
      nextToken = data.value?.nextToken;
    } while (nextToken);
    return result;
  };

  const restoreResources = async (resourceIds, existingRestoredResources = null) => {
    if (existingRestoredResources) {
      resourceMap.value = existingRestoredResources;
      return;
    }
    if (!resourceIds || resourceIds.length === 0) {
      resourceMap.value = {};
      return;
    }
    isLoading.value = true;
    try {
      restoredResources.value = await fetchResources(resourceIds);
      if (!restoredResources.value || restoredResources.value.length === 0) {
        return;
      }
      resourceMap.value = { ...resourceMap.value, ...Object.fromEntries(restoredResources.value.map(resource => [resource[keyField], resource])) };
    } catch (error) {
      console.error(error);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    resourceMap,
    isLoading,
    restoreResources,
  };
}

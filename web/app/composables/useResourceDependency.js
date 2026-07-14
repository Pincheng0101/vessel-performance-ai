import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server/resourceDependency';
 */

export function useResourceDependency() {
  const server = useServer();
  const { createSignal } = useAbortController();

  const isLoading = ref(false);
  /**
   * @type {Ref<Resource[]>}
   */
  const dependents = ref([]);
  /**
   * @type {Ref<Resource[]>}
   */
  const dependencies = ref([]);

  const sortByResourceType = (resources) => {
    // Sort to ensure workflows appear first, followed by other resource types.
    return resources
      .slice()
      .sort((a, b) => {
        if (a.resourceType === ResourceConstant.Type.WORKFLOW.value && b.resourceType !== ResourceConstant.Type.WORKFLOW.value) return -1;
        if (a.resourceType !== ResourceConstant.Type.WORKFLOW.value && b.resourceType === ResourceConstant.Type.WORKFLOW.value) return 1;
        return 0;
      });
  };

  const fetchDependencies = async ({
    resourceType,
    resourceId,
    isRecursive = true,
  }) => {
    const signal = createSignal();
    isLoading.value = true;
    const { data, error } = await server.resourceDependency.list({
      resourceType,
      resourceId,
      isRecursive,
    }, {
      lazy: false,
      signal,
    });
    if (signal.aborted) return;

    if (error.value) {
      isLoading.value = false;
      return;
    }
    dependents.value = sortByResourceType(data.value.dependents);
    dependencies.value = sortByResourceType(data.value.dependencies);
    isLoading.value = false;
  };

  return {
    dependencies,
    dependents,
    fetchDependencies,
    isLoading,
  };
}

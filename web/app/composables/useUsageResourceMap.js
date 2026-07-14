import { ErrorResponse } from '~/models/server';
import { UsageResourceMapHelper } from '~/models/ui/usage';

export function useUsageResourceMap({
  resourceTypes = UsageResourceMapHelper.defaultResourceTypes,
} = {}) {
  const server = useServer();
  const breadcrumbStore = useBreadcrumbStore();
  const snackbarStore = useSnackbarStore();
  const { $i18n } = useNuxtApp();

  const resourceMap = ref(UsageResourceMapHelper.createEmptyResourceMap(resourceTypes));
  const refreshResourceMapRequest = ref(0);
  const currentResource = ref(null);
  const refreshCurrentResourceRequest = ref(0);

  const resetResourceMap = () => {
    resourceMap.value = UsageResourceMapHelper.createEmptyResourceMap(resourceTypes);
  };

  const getResourceName = (resource) => {
    const { resourceId, resourceType } = resource;

    if (!resourceId) {
      return '';
    }

    return resourceMap.value[resourceType]?.[resourceId]?.name ?? resourceId;
  };

  const getResourceLink = (resource, {
    target = '_blank',
  } = {}) => {
    const { resourceId, resourceType } = resource;

    if (!resourceId || !resourceType) {
      return null;
    }

    return {
      href: resourceUtils.getUrl(resourceType, resourceId),
      target,
    };
  };

  const loadResourceMap = async (resources = []) => {
    const requestId = ++refreshResourceMapRequest.value;
    const queries = UsageResourceMapHelper.buildResourceQueries(resources);

    resetResourceMap();

    if (queries.length < 1) {
      return;
    }

    const { data } = await server.multiRequest.get(queries, { lazy: false });

    if (requestId !== refreshResourceMapRequest.value) {
      return;
    }

    resourceMap.value = UsageResourceMapHelper.buildResourceMap({
      data: data.value,
      resourceTypes,
    });
  };

  const loadCurrentResource = async ({
    resourceId,
    resourceType,
  }) => {
    const requestId = ++refreshCurrentResourceRequest.value;
    currentResource.value = null;
    breadcrumbStore.setLoading(true);

    try {
      const typeConfig = UsageResourceMapHelper.getResourceTypeConfig(resourceType);

      if (!typeConfig?.module) {
        return;
      }

      const serviceModule = server[typeConfig.module];

      if (!serviceModule?.get) {
        return;
      }

      const getParams = {
        [`${typeConfig.id}`]: resourceId,
      };

      const { data, error } = await serviceModule.get(getParams, {
        lazy: false,
        onResponseError: ({ response }) => {
          // Suppress snackbar for 400 errors in usage pages
          // The page will continue to show usage data even if resource is not found
          if (response.status !== 400) {
            const errorResponse = new ErrorResponse(response._data);
            errorResponse.setStatus(response.status);
            snackbarStore.setFailure(errorResponse.getMessage() || $i18n.t('__messageServerError'));
          }
        },
      });

      if (requestId !== refreshCurrentResourceRequest.value) {
        return;
      }

      if (!error.value) {
        currentResource.value = data.value;
        breadcrumbStore.setBreadcrumb(resourceId, data.value?.name || resourceId);
      }
    } finally {
      if (requestId === refreshCurrentResourceRequest.value) {
        breadcrumbStore.setLoading(false);
      }
    }
  };

  return {
    currentResource,
    getResourceLink,
    getResourceName,
    loadCurrentResource,
    loadResourceMap,
  };
}

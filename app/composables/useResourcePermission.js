import { AccountConstant, ResourceConstant } from '~/constants';

export function useResourcePermission() {
  const authStore = useAuthStore();
  const server = useServer();
  const route = useRoute();

  const hasWritePermission = async (resourceType) => {
    if (authStore.parsedToken.isAdmin) return true;

    const getPermissionConfig = (type) => {
      if (type === ResourceConstant.Type.WORKFLOW.value) {
        return {
          listByUser: server.workflowPermission.listByUser,
          idField: 'workflow_id',
          useResourceType: false,
        };
      }

      if (type === ResourceConstant.Type.AGENT.value) {
        return {
          listByUser: server.agentPermission.listByUser,
          idField: 'agent_id',
          useResourceType: false,
        };
      }

      return {
        listByUser: server.resourcePermission.listByUser,
        idField: 'resource_id',
        useResourceType: true,
      };
    };

    const config = getPermissionConfig(resourceType);
    const baseParams = {
      username: authStore.parsedToken.username,
      filters: [
        { field: config.idField, operator: '=', value: route.params.id },
        { field: 'permission', operator: '=', value: AccountConstant.AccessType.WRITE.value },
      ],
    };

    if (config.useResourceType) {
      baseParams.resourceType = resourceType;
    }

    const { data, error } = await config.listByUser({
      ...baseParams,
      nextToken: null,
    }, {
      lazy: false,
    });

    if (error.value) return false;
    return data.value.data.length > 0;
  };

  return {
    hasWritePermission,
  };
}

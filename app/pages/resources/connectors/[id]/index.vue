<script setup>
import { ConnectorConstant, ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.connector.get({
  connectorId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ connectorId }) => {
  const { error } = await server.connector.destroy({ connectorId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.connector.duplicate({
    connectorId: route.params.id,
    newConnectorName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`${data.value.id}`);
};
</script>

<template>
  <template v-if="pending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceInfoTitle :title="data.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="data"
            :type="data.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="data"
            :module="ResourceConstant.Type.CONNECTOR.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, data.id)}/edit`"
            :item-label="$t('__fieldConnector')"
            :allow-delete-recursively="ResourceConstant.Type.CONNECTOR.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.CONNECTOR.allowValidate && findField(ConnectorConstant.Type, data.connectorType, 'supportsValidate')"
            :allow-aws-credential="findField(ConnectorConstant.Type, data.connectorType, 'allowAwsCredential')"
            :validate-button-tooltip="findField(ConnectorConstant.Type, data.connectorType, 'i18nValidateAction') ? $t(findField(ConnectorConstant.Type, data.connectorType, 'i18nValidateAction')) : ''"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.CONNECTOR.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.CONNECTOR.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldConnector')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

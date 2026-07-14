<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.lambdaFunction.get({
  lambdaFunctionId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ lambdaFunctionId }) => {
  const { error } = await server.lambdaFunction.destroy({ lambdaFunctionId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value), { replace: true });
};

const handleDuplicate = async (resource) => {
  const { data, error } = await server.lambdaFunction.duplicate({
    lambdaFunctionId: route.params.id,
    newLambdaFunctionName: resource.name,
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
            :module="ResourceConstant.Type.LAMBDA_FUNCTION.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, data.id)}/edit`"
            :item-label="$t('__fieldLambdaFunction')"
            :allow-delete-recursively="ResourceConstant.Type.LAMBDA_FUNCTION.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.LAMBDA_FUNCTION.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LAMBDA_FUNCTION.value"
            :lowercase-resource-title="false"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LAMBDA_FUNCTION.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else-if="error">
      <ResourceErrorCard
        :label="$t('__fieldLambdaFunction')"
        :status-code="error.data.status"
      />
    </template>
  </template>
</template>

<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.template.get({
  templateId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ templateId }) => {
  const { error } = await server.template.destroy({ templateId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.TEMPLATE.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.template.duplicate({
    templateId: route.params.id,
    newTemplateName: resource.name,
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
            :module="ResourceConstant.Type.TEMPLATE.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.TEMPLATE.value, data.id)}/edit`"
            :item-label="$t('__fieldTemplate')"
            :allow-delete-recursively="ResourceConstant.Type.TEMPLATE.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.TEMPLATE.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup :items="data.templateDisplayFields" />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.TEMPLATE.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.TEMPLATE.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldTemplate')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

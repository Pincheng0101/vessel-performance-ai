<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.skill.get({
  skillId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ skillId }) => {
  const { error } = await server.skill.destroy({ skillId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SKILL.value), { replace: true });
};

const handleDuplicate = async (resource) => {
  const { data, error } = await server.skill.duplicate({
    skillId: route.params.id,
    newSkillName: resource.name,
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
            :module="ResourceConstant.Type.SKILL.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, data.id)}/edit`"
            :item-label="$t('__fieldSkill')"
            :allow-delete-recursively="ResourceConstant.Type.SKILL.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.SKILL.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup :items="data.skillMarkdownDisplayFields" />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.SKILL.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.SKILL.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else-if="error">
      <ResourceErrorCard
        :label="$t('__fieldSkill')"
        :status-code="error.data.status"
      />
    </template>
  </template>
</template>

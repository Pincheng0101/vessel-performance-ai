<script setup>
import { LlmConstant, ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.llm.get({
  llmId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ llmId }) => {
  const { error } = await server.llm.destroy({ llmId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LLM.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.llm.duplicate({
    llmId: route.params.id,
    newLlmName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LLM.value, data.value.id));
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
            :module="ResourceConstant.Type.LLM.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.LLM.value, data.id)}/edit`"
            :item-label="$t('__fieldLlm')"
            :allow-delete-recursively="ResourceConstant.Type.LLM.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.LLM.allowValidate"
            :allow-aws-credential="findField(LlmConstant.Type, data.llmType, 'allowAwsCredential')"
            :validate-button-tooltip="$t(findField(LlmConstant.Type, data.llmType, 'i18nValidateAction'))"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup
                :items="data.systemPromptDisplayFields"
                :cols="12"
              />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LLM.value"
            :lowercase-resource-title="false"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LLM.value"
            :lowercase-resource-title="false"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldLlm')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

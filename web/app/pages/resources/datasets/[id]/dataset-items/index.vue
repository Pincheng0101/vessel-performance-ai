<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const { t } = useI18n();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const { createSignal } = useAbortController();

const state = reactive({
  dataset: null,
  datasetItem: null,
  datasetError: null,
  datasetItemError: null,
  isLoading: false,
  stopFetching: false,
  currentFetchId: 0,
});

breadcrumbStore.setLoading(true);

const fetchDataset = async () => {
  const signal = createSignal();
  state.isLoading = true;
  const { data, error } = await server.dataset.get({
    datasetId: route.params.id,
  }, {
    signal,
    lazy: false,
    onResponse: ({ _data }) => {
      breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
      breadcrumbStore.setLoading(false);
    },
  });
  if (error.value) {
    state.datasetError = error.value;
    state.isLoading = false;
    return;
  }
  state.dataset = data;
  state.isLoading = false;
};

const init = () => {
  fetchDataset();
};

init();
</script>

<template>
  <template v-if="state.isLoading">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="state.dataset">
      <ResourceInfoTitle :title="state.dataset.name" />
      <AppTabs
        :items="[
          { title: t('__titleGeneral'), to: resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, state.dataset.id) },
          { title: t('__titleDependency', 2), to: `${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, state.dataset.id)}?tab=dependencies` },
          { title: t('__titleDependent', 2), to: `${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, state.dataset.id)}?tab=dependents` },
        ]"
      />
      <template v-if="route.query.tab === 'dependencies'">
        <ResourceDependencyList
          :type="ResourceConstant.DependencyType.DEPENDENCY.value"
          :resource-id="state.dataset.id"
          :resource-type="ResourceConstant.Type.DATASET.value"
        />
      </template>
      <template v-else-if="route.query.tab === 'dependents'">
        <ResourceDependencyList
          :resource-id="state.dataset.id"
          :resource-type="ResourceConstant.Type.DATASET.value"
        />
      </template>
    </template>
    <template v-else-if="state.datasetError">
      <ResourceErrorCard
        :label="$t('__fieldDatasetItem')"
        :status-code="state.datasetError.data.status"
      />
    </template>
  </template>
</template>

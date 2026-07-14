<script setup>
import { IconConstant, ListConstant, ResourceConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const { page, perPage, filters, query, nextTokenMap, initUrlParams, goToPreviousPage } = usePagination();
const route = useRoute();

const state = reactive({
  cronJobs: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchWorkflowCronJobs = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();
  state.isLoading = true;
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  state.cronJobs = [];
  const { data, error } = await server.workflowCron.list({
    workflowId: route.params.id,
    nextToken,
    limit: perPage.value,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.isLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;
  page.value = pageValue;
  state.cronJobs = data.value.data;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.cronJobs.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchWorkflowCronJobs(page.value);
  }
};

initUrlParams();
fetchWorkflowCronJobs(page.value);

const handleDelete = async ({ workflowCronId }) => {
  const { error } = await server.workflowCron.destroy({ workflowCronId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchWorkflowCronJobs(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchWorkflowCronJobs(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchWorkflowCronJobs();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchWorkflowCronJobs();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchWorkflowCronJobs();
};
</script>

<template>
  <AppTable
    :title="$t('__titleSchedule', 2)"
    :icon="IconConstant.Base.CRON_JOB"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs/${item.id}` }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.cronJobs"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :per-page="perPage"
    :query="query"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchWorkflowCronJobs(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__titleSchedule') })"
        :on-click="() => navigateTo(`${route.params.id}/cron-jobs/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceTableRowMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__titleSchedule')"
        :on-delete="handleDelete"
        :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.workflowId)}/cron-jobs/${item.id}/edit`)"
        :on-resources-fetch="() => fetchWorkflowCronJobs(page)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="IconConstant.Base.CRON_JOB"
        :resource-label="$t('__titleSchedule')"
        :instruction="$t('__instructionWorkflowCronJob')"
        :on-click="() => navigateTo(`${route.params.id}/cron-jobs/create`)"
      />
    </template>
  </AppTable>
</template>

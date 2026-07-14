<script setup>
import { ListConstant, ResourceConstant, RuntimeConstant, StatusConstant, SyncJobConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const route = useRoute();
const server = useServer();
const { page, perPage, sortField, sortOrder, filters, query, nextTokenMap, initUrlParams } = usePagination();
const { createSignal } = useAbortController();

const state = reactive({
  /**
   * @type {SyncJob}
   */
  syncJobs: [],
  isStopping: false,
  isLoading: false,
});

const fetchSyncJob = async (syncJobId) => {
  const { data, error } = await server.syncJob.get({ syncJobId });
  if (error.value) return;
  return data.value;
};

const fetchSyncJobs = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.syncJobs = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.syncJob.list({
    loaderId: route.params.id,
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value,
    query: query.value,
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
  state.syncJobs = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
};

initUrlParams();
fetchSyncJobs(page.value);

const start = async (formData) => {
  const { error } = await server.syncJob.start({
    loaderId: route.params.id,
    ...formData,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionStart');
  fetchSyncJobs(page.value);
};

const handleStop = async ({ syncJobId }) => {
  // Delay to allow the stop operation to complete
  await delay(1000);
  const job = await fetchSyncJob(syncJobId);
  if (!job) return;
  const target = state.syncJobs.find(syncJob => syncJob.syncJobId === job.syncJobId);
  if (target) {
    Object.assign(target, job);
  }
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchSyncJobs(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchSyncJobs();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchSyncJobs();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchSyncJobs();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchSyncJobs();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldSyncJob', 2)"
    :icon="RuntimeConstant.Type.SYNC_JOB.icon"
    :headers="[
      { title: $t('__fieldId'), key: 'id', link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, route.params.id)}/sync-jobs/${item.id}` }) },
      { title: $t('__fieldMode'), key: 'mode', value: item => findField(SyncJobConstant.Mode, item.mode, 'title') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.syncJobs"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldId'), field: 'sync_job_id' },
      { title: $t('__fieldMode'), field: 'mode', values: Object.values(SyncJobConstant.Mode) },
      { title: $t('__fieldStatus'), field: 'status', values: Object.values(StatusConstant.Runtime).map(item => ({ ...item, title: $t(item.i18nTitle) })) },
    ]"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchSyncJobs(page)"
      />
      <AppDialog :on-submit="start">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-play"
            class="primary-gradient"
            size="small"
            :tooltip="$t('__actionSyncJobStart')"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <SyncJobStartForm
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceSyncJobActionMenu
        :item="item"
        :persistent="isHovering"
        :on-stop="handleStop"
      />
    </template>
    <template #no-data>
      <ResourceInitCard
        :icon="RuntimeConstant.Type.SYNC_JOB.icon"
        :resource-label="$t('__fieldSyncJob')"
        :title="$t('__titleStartSyncJob')"
        :instruction="$t('__instructionResourceSyncJob')"
        :on-click="start"
      >
        <template #actions="{ onClick }">
          <AppDialog :on-submit="onClick">
            <template #activator="{ onOpen }">
              <AppButton
                :width="160"
                :text="$t('__actionStart')"
                size="large"
                color="primary"
                prepend-icon="mdi-play"
                @click="onOpen"
              />
            </template>
            <template #body="{ onSubmit, onCancel }">
              <SyncJobStartForm
                :on-submit="onSubmit"
                :on-discard="onCancel"
              />
            </template>
          </AppDialog>
        </template>
      </ResourceInitCard>
    </template>
  </AppTable>
</template>

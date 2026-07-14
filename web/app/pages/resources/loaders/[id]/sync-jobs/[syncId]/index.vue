<script setup>
import { StatusConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  syncJob: {},
  error: null,
  isLoading: false,
  isStopping: false,
});

breadcrumbStore.setLoading(true);

server.loader.get({
  loaderId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const fetchSyncJob = async () => {
  state.isLoading = true;
  const { data, error } = await server.syncJob.get({ syncJobId: route.params.syncId }, { lazy: false });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  state.syncJob = data.value;
  state.isLoading = false;
};

const stop = async () => {
  state.isStopping = true;
  const { error } = await server.syncJob.stop({ syncJobId: state.syncJob.id });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionStop');
  // Delay to allow the stop operation to complete
  await delay(1000);
  state.isStopping = false;
  fetchSyncJob();
};

fetchSyncJob();
</script>

<template>
  <template v-if="state.isLoading">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="state.syncJob">
      <ResourceInfoTitle :title="state.syncJob.id" />
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
        ]"
      >
        <template #general>
          <AppDetailsCard :display-fields="state.syncJob.displayFields">
            <template #actions>
              <AppIconButton
                icon="mdi-stop-circle"
                variant="text"
                aria-label="Stop sync job"
                :loading="state.isStopping"
                :disabled="state.syncJob?.status !== StatusConstant.Runtime.RUNNING.value"
                :tooltip="$t('__actionStop')"
                @click="stop()"
              />
            </template>
          </AppDetailsCard>
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="state.error">
        <ResourceErrorCard
          :label="$t('__fieldSyncJob')"
          :status-code="state.error.data.status"
        />
      </template>
    </template>
  </template>
</template>

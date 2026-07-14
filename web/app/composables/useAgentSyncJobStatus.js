import { ResourceConstant, StatusConstant } from '~/constants';

export function useAgentSyncJobStatus({ agentId }) {
  const server = useServer();
  const { createSignal: createRunningSyncJobListSignal } = useAbortController();
  const { createSignal: createSyncJobListSignal } = useAbortController();
  const {
    dependencies,
    fetchDependencies,
  } = useResourceDependency();

  const state = reactive({
    loaderId: null,
    runningSyncJobId: null,
    syncJobStatus: null,
    isSyncJobStatusCardVisible: false,
  });

  let syncJobStatusPoller = null;
  let hideStatusCardTimer = null;

  const stopSyncJobStatusPolling = () => {
    if (!syncJobStatusPoller) return;
    clearInterval(syncJobStatusPoller);
    syncJobStatusPoller = null;
  };

  const clearHideStatusCardTimer = () => {
    if (!hideStatusCardTimer) return;
    clearTimeout(hideStatusCardTimer);
    hideStatusCardTimer = null;
  };

  const showStatusThenHide = () => {
    clearHideStatusCardTimer();
    state.isSyncJobStatusCardVisible = true;
    hideStatusCardTimer = setTimeout(() => {
      state.isSyncJobStatusCardVisible = false;
    }, 5000);
  };

  const applySyncJobStatusCardVisibility = ({ nextStatus, previousStatus }) => {
    const isRunning = nextStatus === StatusConstant.Runtime.RUNNING.value;
    const wasRunning = previousStatus === StatusConstant.Runtime.RUNNING.value;

    if (isRunning) {
      clearHideStatusCardTimer();
      state.isSyncJobStatusCardVisible = true;
      return;
    }

    state.runningSyncJobId = null;
    stopSyncJobStatusPolling();

    if (wasRunning) {
      showStatusThenHide();
      return;
    }

    state.isSyncJobStatusCardVisible = false;
  };

  const findRunningSyncJob = async () => {
    const runningSyncJobListSignal = createRunningSyncJobListSignal();
    const syncJobListSignal = createSyncJobListSignal();

    if (!state.loaderId) {
      state.runningSyncJobId = null;
      state.syncJobStatus = null;
      state.isSyncJobStatusCardVisible = false;
      stopSyncJobStatusPolling();
      return;
    }

    let runningSyncJob = null;
    const { data, error } = await server.syncJob.list({
      loaderId: state.loaderId,
      limit: 1,
      filters: [
        {
          field: 'status',
          operator: '=',
          value: StatusConstant.Runtime.RUNNING.value,
        },
      ],
    }, {
      lazy: false,
      signal: runningSyncJobListSignal,
    });
    if (runningSyncJobListSignal.aborted) return;

    if (error.value) return;
    runningSyncJob = data.value.data?.[0] || null;

    let latestSyncJobStatus = null;
    if (!runningSyncJob) {
      const { data: latestData, error: latestError } = await server.syncJob.list({
        loaderId: state.loaderId,
        limit: 1,
      }, {
        lazy: false,
        signal: syncJobListSignal,
      });
      if (syncJobListSignal.aborted) return;

      if (latestError.value) return;
      latestSyncJobStatus = latestData.value.data?.[0]?.status || null;
    }

    state.runningSyncJobId = runningSyncJob?.syncJobId || runningSyncJob?.id || null;
    state.syncJobStatus = runningSyncJob?.status || latestSyncJobStatus || null;
  };

  const trackRunningSyncJobStatus = async () => {
    if (!state.runningSyncJobId) {
      stopSyncJobStatusPolling();
      return;
    }

    const { data, error } = await server.syncJob.get({
      syncJobId: state.runningSyncJobId,
    }, {
      lazy: false,
    });
    if (error.value) return;

    const nextStatus = data.value?.status || null;
    state.syncJobStatus = nextStatus;
  };

  const initSyncJobStatusTracking = async () => {
    await fetchDependencies({
      resourceType: ResourceConstant.Type.AGENT.value,
      resourceId: agentId,
    });
    const loaderDependency = dependencies.value.find(item => item.resourceType === ResourceConstant.Type.LOADER.value);
    state.loaderId = loaderDependency?.resourceId || null;
    await findRunningSyncJob();
  };

  watch(() => state.syncJobStatus, (nextStatus, previousStatus) => {
    applySyncJobStatusCardVisibility({ nextStatus, previousStatus });
  });

  onMounted(() => {
    syncJobStatusPoller = setInterval(trackRunningSyncJobStatus, 5000);
  });

  onBeforeUnmount(() => {
    stopSyncJobStatusPolling();
    clearHideStatusCardTimer();
  });

  const {
    loaderId,
    syncJobStatus,
    isSyncJobStatusCardVisible,
  } = toRefs(state);

  return {
    loaderId,
    syncJobStatus,
    isSyncJobStatusCardVisible,
    initSyncJobStatusTracking,
  };
}

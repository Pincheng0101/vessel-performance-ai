<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

const props = defineProps({
  status: {
    type: String,
    default: null,
  },
  loaderId: {
    type: String,
    default: null,
  },
});

const { t } = useI18n();

const statusConfig = computed(() => {
  const syncJobsPath = props.loaderId
    ? `${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, props.loaderId)}?tab=sync-jobs`
    : '';
  const syncJobsUrl = urlUtils.toAbsolute(syncJobsPath);

  switch (props.status) {
    case StatusConstant.Runtime.RUNNING.value:
      return {
        text: t('__instructionAgentSyncJobStatusRunning'),
      };
    case StatusConstant.Runtime.SUCCEEDED.value:
      return {
        text: t('__instructionAgentSyncJobStatusSucceeded'),
        icon: 'mdi-check-circle-outline',
        iconColor: 'success',
      };
    case StatusConstant.Runtime.FAILED.value:
      return {
        text: t('__instructionAgentSyncJobStatusFailed', { url: syncJobsUrl }),
        icon: 'mdi-alert-circle-outline',
        iconColor: 'error',
      };
    case StatusConstant.Runtime.ABORTED.value:
      return {
        text: t('__instructionAgentSyncJobStatusAborted', { url: syncJobsUrl }),
        icon: 'mdi-stop-circle-outline',
        iconColor: 'warning',
      };
    default:
      return {
        text: t('__instructionAgentSyncJobStatusPending'),
        icon: 'mdi-alert-outline',
        iconColor: 'warning',
      };
  }
});
</script>

<template>
  <div
    v-if="props.status"
    class="d-flex align-center ga-1 text-red"
  >
    <template v-if="props.status === StatusConstant.Runtime.RUNNING.value">
      <AppProgressCircular
        color="grey"
        :size="12"
        :width="2"
      />
    </template>
    <template v-else>
      <v-icon
        :icon="statusConfig.icon"
        :color="statusConfig.iconColor"
        size="16"
      />
    </template>
    <AppMarkdown
      :text="statusConfig.text"
      inline
      class="text-caption text-grey"
    />
  </div>
</template>

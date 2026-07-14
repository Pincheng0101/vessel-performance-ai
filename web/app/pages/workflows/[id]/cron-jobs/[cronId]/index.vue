<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const server = useServer();

const state = reactive({
  cronJob: {},
  error: null,
  isLoading: false,
});

const fetchCronJob = async () => {
  state.isLoading = true;
  const { data, error } = await server.workflowCron.get({ workflowCronId: route.params.cronId }, { lazy: false });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  state.cronJob = data.value;
  state.isLoading = false;
};

const handleDelete = async () => {
  const { error } = await server.workflowCron.destroy({ workflowCronId: route.params.cronId });
  if (error.value) {
    return;
  }
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs`, { replace: true });
};

fetchCronJob();
</script>

<template>
  <template v-if="state.isLoading">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="state.cronJob">
      <ResourceInfoTitle :title="state.cronJob.name" />
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__fieldExecution', 2), value: 'executions' },
        ]"
      >
        <template #general>
          <AppDetailsCard
            :display-fields="state.cronJob.displayFields"
            :on-delete="handleDelete"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup :items="state.cronJob.stateInputDisplayFields" />
            </template>
            <template #actions>
              <AppIconButton
                :aria-label="$t('__actionEdit')"
                icon="mdi-pencil"
                variant="text"
                :tooltip="$t('__actionEdit')"
                :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs/${state.cronJob.id}/edit`)"
              />
              <ResourceDeleteButton
                :item="state.cronJob"
                :item-label="$t('__titleSchedule')"
                :allow-delete-recursively="false"
                :on-delete="handleDelete"
              />
            </template>
          </AppDetailsCard>
        </template>
        <template #executions>
          <WorkflowCronJobExecutionList />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="state.error">
        <ResourceErrorCard
          :label="$t('__titleSchedule')"
          :status-code="state.error.data.status"
        />
      </template>
    </template>
  </template>
</template>

<script setup>
import { ResourceConstant, RuntimeConstant } from '~/constants';

/**
 * @import { WorkflowExecution } from '~/models/server/workflowExecution'
 */

const route = useRoute();
const server = useServer();
const { openInNewTab } = useNavigation();
const { sortField, sortOrder, initUrlParams } = usePagination();

const state = reactive({
  /**
   * @type {WorkflowExecution}
   */
  workflowExecutions: [],
  isLoading: false,
  stopFetching: false,
  currentFetchId: 0,
});

const fetchWorkflowExecution = async (executionArn) => {
  const { data, error } = await server.workflowExecution.get({ executionArn });
  if (error.value) return;
  return data.value;
};

const fetchAllWorkflowExecutions = async () => {
  const fetchId = ++state.currentFetchId;
  state.isLoading = true;
  state.workflowExecutions = [];
  state.stopFetching = false;
  let nextToken = null;
  const isCancelled = () => state.stopFetching || fetchId !== state.currentFetchId;
  do {
    if (isCancelled()) break;
    const { data, error } = await server.workflowExecution.list({
      workflowId: route.params.id,
      nextToken,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
    }, {
      lazy: false,
    });
    if (isCancelled()) break;
    if (error.value) {
      state.isLoading = false;
      return;
    }
    state.workflowExecutions.push(...data.value.data);
    nextToken = data.value.nextToken;
    state.isLoading = false;
  } while (nextToken && !state.stopFetching);
};

initUrlParams();
fetchAllWorkflowExecutions();

const handleStop = async ({ executionArn }) => {
  // Delay to allow the stop operation to complete
  await delay(1000);
  const execution = await fetchWorkflowExecution(executionArn);
  const target = state.workflowExecutions.find(workflowExecution => workflowExecution.executionArn === execution.executionArn);
  if (target) {
    Object.assign(target, execution);
  }
};

const handleEdit = async ({ executionArn }) => {
  const execution = await fetchWorkflowExecution(executionArn);
  const target = state.workflowExecutions.find(workflowExecution => workflowExecution.executionArn === execution.executionArn);
  if (target) {
    Object.assign(target, execution);
  }
};

onBeforeUnmount(() => {
  state.stopFetching = true;
});
</script>

<template>
  <AppTable
    :title="$t('__fieldExecution', 2)"
    :server-side="false"
    :icon="RuntimeConstant.Type.WORKFLOW_EXECUTION.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'displayName', link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/executions/${item.executionArn}` }) },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldStartTs'), key: 'startTs', isTimestamp: true, sortable: true },
      { title: $t('__fieldStopTs'), key: 'stopTs', isTimestamp: true },
    ]"
    :items="state.isLoading ? [] : state.workflowExecutions"
    :loading="state.isLoading"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="async () => {
          state.stopFetching = true;
          await $nextTick();
          fetchAllWorkflowExecutions();
        }"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <WorkflowExecutionActionMenu
        :item="item"
        :persistent="isHovering"
        :on-stop="handleStop"
        :on-edit="handleEdit"
      />
    </template>
    <template #no-data>
      <ResourceInitCard
        :icon="RuntimeConstant.Type.WORKFLOW_EXECUTION.icon"
        :resource-label="$t('__fieldExecution')"
        :title="$t('__titleStartExecution')"
        :instruction="$t('__instructionWorkflowExecution')"
        :on-click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute`)"
      >
        <template #actions="{ onClick }">
          <AppButton
            :width="160"
            :text="$t('__actionStart')"
            size="large"
            color="primary"
            prepend-icon="mdi-play"
            @click="onClick"
          />
        </template>
      </ResourceInitCard>
    </template>
  </AppTable>
</template>

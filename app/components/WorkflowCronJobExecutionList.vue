<script setup>
import { ListConstant, ResourceConstant } from '~/constants';

const server = useServer();
const route = useRoute();
const { createSignal } = useAbortController();
const { page, perPage, nextTokenMap, goToPreviousPage } = usePagination();

const state = reactive({
  isLoading: false,
  executions: [],
});

const fetchWorkflowCronExecution = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();
  state.isLoading = true;
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  state.executions = [];
  const { data, error } = await server.workflowCronExecution.list({
    workflowCronId: route.params.cronId,
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
  state.executions = data.value.data;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.executions.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchWorkflowCronExecution(page.value);
  }
};

fetchWorkflowCronExecution();
</script>

<template>
  <AppTable
    :server-side="false"
    item-value="id"
    :headers="[
      { title: $t('__fieldExecutionArn'), key: 'executionArn', link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/executions/${item.executionArn}`, target: '_blank' }) },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldExecutionTime'), key: 'executionTs', isTimestamp: true, timeIntervalOptions: { format: 'YYYY-MM-DD HH:mm:ss.SSS' } },
    ]"
    :items="state.executions"
    :per-page="perPage"
    :loading="state.isLoading"
    :show-progress="state.isLoading"
    enable-expand
    :is-expanded-row-visible="item => !!item.error"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchWorkflowCronExecution()"
      />
    </template>
    <template #no-data>
      <p class="d-flex justify-center align-center">
        {{ $t('__instructionNoResultsFound') }}
      </p>
    </template>
    <template #expanded-row="{ item }">
      <div class="py-3">
        <AppDisplayFieldGroup
          :items="[{
            title: $t('__fieldError'),
            value: typeof item.error === 'object' ? JSON.stringify(item.error) : String(item.error),
            isBlockText: true,
          }]"
        />
      </div>
    </template>
  </AppTable>
</template>

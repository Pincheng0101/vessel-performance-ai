<script setup>
import { WorkflowExecutionConstant } from '~/constants';

const props = defineProps({
  executionArn: {
    type: String,
    required: true,
  },
});

const state = reactive({
  viewMode: WorkflowExecutionConstant.ViewMode.TIMELINE.value,
});
</script>

<template>
  <AppDetailsCard
    :title="$t('__titleHistory')"
    card-text-class="pa-0"
  >
    <template #actions>
      <AppButtonToggle
        v-model="state.viewMode"
        :button-width="24"
        :elevation="0"
        :items="Object.values(WorkflowExecutionConstant.ViewMode).map(item => ({
          ...item,
          tooltip: $t(item.tooltip),
        }))"
      />
    </template>
    <template #body>
      <template v-if="state.viewMode === WorkflowExecutionConstant.ViewMode.TIMELINE.value">
        <div class="pa-5">
          <WorkflowExecutionHistoryTimeline :execution-arn="props.executionArn" />
        </div>
      </template>
      <template v-if="state.viewMode === WorkflowExecutionConstant.ViewMode.LIST.value">
        <WorkflowExecutionHistoryList
          :execution-arn="props.executionArn"
          :rounded="false"
          hide-details
        />
      </template>
    </template>
  </AppDetailsCard>
</template>

<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';
import { WorkflowExecution } from '~/models/server/workflowExecution';

const route = useRoute();
const dayjs = useDayjs();
const workflowExecutionStore = useWorkflowExecutionStore();

const state = reactive({
  scrollCount: 0,
});

const { workflowExecutions } = storeToRefs(workflowExecutionStore);

const loadWorkflowExecutions = async ({ done = () => {} } = {}) => {
  await workflowExecutionStore.loadWorkflowExecutions({
    workflowId: route.params.id,
    done,
  });
};

/**
 * @param {WorkflowExecution} workflowExecution
 */
const handleEdit = (workflowExecution) => {
  workflowExecutionStore.updateWorkflowExecutionDisplayName(workflowExecution);
  workflowExecutionStore.setUpdatedWorkflowExecution(workflowExecution);
};

/**
 * @param {WorkflowExecution} workflowExecution
 */
const handleStop = (workflowExecution) => {
  workflowExecutionStore.setStoppedWorkflowExecution(new WorkflowExecution({
    ...workflowExecution,
    status: StatusConstant.Runtime.ABORTED.value,
    stopTs: dayjs().unix(),
  }));
};

const handleScroll = useThrottleFn(() => {
  state.scrollCount += 1;
}, 1000);

watch(() => route.params.id, () => {
  workflowExecutionStore.reset();
}, { immediate: true });

onBeforeUnmount(() => {
  workflowExecutionStore.reset();
});
</script>

<template>
  <LayoutHeader>
    <template #navigation-drawer>
      <div class="px-3 py-5">
        <AppButton
          class="primary-gradient"
          width="100%"
          :text="$t('__actionNewExecution')"
          prepend-icon="mdi-plus"
          :to="`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute`"
        />
      </div>
      <v-list
        :rounded="false"
        class="py-0"
      >
        <!-- 100dvh - padding - logo height - button height - padding - avatar bar -->
        <v-infinite-scroll
          height="calc(100dvh - 24px - 24px - 36px - 40px - 57px)"
          @load="loadWorkflowExecutions"
          @scroll="handleScroll"
        >
          <template
            v-for="(item, i) in workflowExecutions"
            :key="i"
          >
            <AppDateSeparator
              :index="i"
              :dates="workflowExecutions.map((date) => dayjs.unix(date.startTs))"
              class="pl-4"
            />
            <v-hover v-slot="{ isHovering, props: p }">
              <v-list-item
                v-bind="p"
                class="pa-0"
                min-height="36"
                :active="route.params.executionArn === item.executionArn"
                :to="`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute/${item.executionArn}`"
              >
                <div class="d-flex align-center justify-space-between ga-2 px-4">
                  <v-icon
                    :icon="findField(StatusConstant.Runtime, item.status, 'icon')"
                    :color="String(item.status).toLowerCase()"
                    :size="20"
                  />
                  <span class="w-100 text-truncate text-body-2">
                    {{ item.displayName }}
                  </span>
                  <WorkflowExecutionActionMenu
                    :item="item"
                    :persistent="isHovering"
                    :close="state.scrollCount"
                    :button-size="24"
                    :on-stop="handleStop"
                    :on-edit="handleEdit"
                  />
                </div>
              </v-list-item>
            </v-hover>
          </template>
          <template #loading>
            <AppProgressCircular
              :size="32"
              :width="2"
            />
          </template>
          <template #empty>
            <template v-if="!workflowExecutionStore.isLoading && workflowExecutions.length === 0">
              <div class="d-flex flex-column align-center justify-center text-body-2 font-weight-bold ga-2">
                {{ $t('__instructionNoExecutionsFound') }}
              </div>
            </template>
          </template>
        </v-infinite-scroll>
      </v-list>
    </template>
  </LayoutHeader>
</template>

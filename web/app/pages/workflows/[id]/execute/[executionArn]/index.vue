<script setup>
import { ActionExecutionConstant, ResourceConstant, StatusConstant } from '~/constants';
import { WorkflowExecution } from '~/models/server/workflowExecution';

/**
 * @import { Workflow } from '~/models/server/workflow';
 */

definePageMeta({
  layout: 'execute',
});

const { t } = useI18n();
const dayjs = useDayjs();
const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const workflowExecutionStore = useWorkflowExecutionStore();

const state = reactive({
  /**
   * @type {Workflow}
   */
  workflow: null,
  workflowError: null,
  workflowPending: false,
  /**
   * @type {WorkflowExecution}
   */
  workflowExecution: null,
  workflowExecutionError: null,
  workflowExecutionPending: false,
  isStopped: false,
  hasTriggeredFetch: false,
  isEditable: false,
});

const tabItems = computed(() => {
  const workflowUpdatedTs = state.workflow?.updatedTs;
  const executionWorkflowDefinition = state.workflowExecution?.workflowDefinition;
  const executionStopTs = state.workflowExecution?.stopTs;
  return [
    { title: t('__titleGeneral'), value: 'general' },
    { title: t('__titleStreamingOutput'), value: 'streaming-output' },
    { title: t('__titleHistory'), value: 'events', isHidden: !executionStopTs },
    { title: t('__fieldExecutionFlow'), value: 'progress', isHidden: !executionStopTs || (!executionWorkflowDefinition && workflowUpdatedTs > executionStopTs) },
  ];
});

breadcrumbStore.setLoading(true);

const getWorkflow = async () => {
  const { data, error, pending } = await server.workflow.get({
    workflowId: route.params.id,
  }, {
    onResponse: ({ _data }) => {
      breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
      breadcrumbStore.setLoading(false);
    },
  });
  state.workflow = data;
  state.workflowError = error;
  state.workflowPending = pending;
};

const getWorkflowExecution = async () => {
  const { data, error, pending } = await server.workflowExecution.get({ executionArn: route.params.executionArn });
  state.workflowExecution = data;
  state.workflowExecutionError = error;
  state.workflowExecutionPending = pending;
};

const startWorkflowExecution = async (formData) => {
  // Create a new workflow execution and set the status to pending
  state.workflowExecution = new WorkflowExecution({
    workflowId: route.params.id,
    status: StatusConstant.Runtime.RUNNING.value,
  });

  let executionData;

  if (formData.useExternalMemoryInput) {
    const { data: uploadData, error: uploadError } = await server.externalMemory.upload();
    if (uploadError.value) {
      return;
    }

    try {
      await server.externalMemory.uploadToS3({
        presignedUrl: uploadData.value.presignedUrl.url,
        payload: formData.input,
      });
    } catch (error) {
      console.error('S3 upload failed:', error);
      return;
    }

    const { data, error } = await server.workflowExecution.startWithExternalMemory({
      ...formData,
      workflowId: route.params.id,
      externalMemoryId: uploadData.value.externalMemoryId,
    });
    if (error.value) {
      Object.assign(state.workflowExecution, {
        status: StatusConstant.Runtime.FAILED.value,
        error: error.value.data.getMessage(),
      });
      return;
    }
    executionData = data.value;
  } else {
    const { data, error } = await server.workflowExecution.start({
      ...formData,
      workflowId: route.params.id,
    });
    if (error.value) {
      Object.assign(state.workflowExecution, {
        status: StatusConstant.Runtime.FAILED.value,
        error: error.value.data.getMessage(),
      });
      return;
    }
    executionData = data.value;
  }

  Object.assign(state.workflowExecution, {
    executionArn: executionData.executionArn,
    displayName: formData.displayName,
    startTs: dayjs().unix(),
  });
  workflowExecutionStore.prependWorkflowExecution(state.workflowExecution);
  snackbarStore.setActionSuccess('__actionStart');
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute/${executionData.executionArn}`);
  await delay(1000);
  scrollUtils.scrollToElementById('#execution-progress', 64 + 8);
};

const fetchWorkflowExecution = async (executionArn) => {
  if (state.isStopped) return;
  const { data, error } = await server.workflowExecution.get({ executionArn });
  if (error.value) {
    state.workflowExecutionError = error;
    return;
  }
  state.workflowExecution = data.value;
  if (state.workflowExecution.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    await fetchWorkflowExecution(executionArn);
    return;
  }
  workflowExecutionStore.replaceWorkflowExecution(state.workflowExecution);
};

const edit = async (formData) => {
  const { error } = await server.workflowExecution.update({ executionArn: state.workflowExecution.executionArn, displayName: formData.displayName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionEdit');
  getWorkflowExecution();
};

watch(() => state.workflowExecution, (after) => {
  if (after && after.executionArn && !state.hasTriggeredFetch) {
    fetchWorkflowExecution(after.executionArn);
    workflowExecutionStore.replaceWorkflowExecution(after);
    state.hasTriggeredFetch = true;
  }
});

watch(() => workflowExecutionStore.updatedWorkflowExecution, (workflowExecution) => {
  if (workflowExecution.executionArn === route.params.executionArn) {
    state.workflowExecution = new WorkflowExecution({
      ...state.workflowExecution,
      displayName: workflowExecution.displayName,
    });
  }
});

watch(() => workflowExecutionStore.stoppedWorkflowExecution, (workflowExecution) => {
  state.isStopped = true;
  if (workflowExecution.executionArn === route.params.executionArn) {
    state.workflowExecution = new WorkflowExecution({
      ...state.workflowExecution,
      stopTs: workflowExecution.stopTs,
      status: workflowExecution.status,
    });
  }
});

getWorkflow();

const initialize = () => {
  if (route.params.id !== arnUtils.getWorkflowId(route.params.executionArn)) {
    navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute`, { replace: true });
    return;
  }
  getWorkflowExecution();
};

initialize();

onBeforeUnmount(() => {
  state.isStopped = true;
  state.workflowExecution = null;
  state.hasTriggeredFetch = false;
});
</script>

<template>
  <template v-if="state.workflow && state.workflowExecution">
    <div class="d-flex align-center justify-space-between text-h5 font-weight-bold my-2">
      <v-sheet
        color="transparent"
        :height="32"
        class="d-flex align-center"
      >
        <div class="d-flex align-center ga-1">
          <template v-if="state.workflow">
            {{ state.workflow.workflowName }}
            <WorkflowInfoMenu :workflow="state.workflow" />
          </template>
        </div>
      </v-sheet>
    </div>
    <div class="d-flex flex-column ga-2">
      <v-row no-gutters>
        <v-col :cols="12">
          <AppTabs
            :items="[
              { title: $t('__titleExecute'), value: 'execute' },
              { title: $t('__titleAbout'), value: 'about' },
            ]"
            :append-query="false"
          >
            <template #execute>
              <template v-if="state.isEditable">
                <WorkflowExecutionForm
                  :form-title="$t('__titleStartExecution')"
                  :input-schema="state.workflow?.inputSchema"
                  :workflow-execution="state.workflowExecution"
                  :use-external-memory-input="state.workflow?.useExternalMemoryInput"
                  :state-memory-input-selector="state.workflow?.stateMemoryInputSelector"
                  :on-submit="startWorkflowExecution"
                  :on-cancel="() => state.isEditable = false"
                />
              </template>
              <template v-else>
                <v-row>
                  <v-col :cols="12">
                    <AppDetailsCard :title="$t('__fieldInput')">
                      <template #actions>
                        <AppButton
                          v-if="!state.isEditable"
                          :text="$t('__actionExecuteAgain')"
                          color="primary"
                          :on-click="() => state.isEditable = true"
                        />
                      </template>
                      <template #body>
                        <AppDisplayField
                          :item="(
                            state.workflowExecution
                              .setInputSchema(state.workflow?.inputSchema)
                              .setWorkflowName(state.workflow?.workflowName)
                              .getInputDisplayField()
                          )"
                        />
                      </template>
                    </AppDetailsCard>
                  </v-col>
                  <v-col :cols="12">
                    <AppDetailsCard :title="$t('__fieldOutput')">
                      <template #body>
                        <template v-if="state.workflowExecution.status === StatusConstant.Runtime.RUNNING.value">
                          <AppProgressCircular
                            :start-time="state.workflowExecution.startTs * 1000"
                            show-elapsed-time
                          />
                        </template>
                        <template v-else>
                          <AppDisplayField
                            :item="(
                              state.workflowExecution
                                .setOutputSchema(state.workflow?.outputSchema)
                                .setWorkflowName(state.workflow?.workflowName)
                                .getOutputDisplayField()
                            )"
                          />
                        </template>
                      </template>
                    </AppDetailsCard>
                  </v-col>
                </v-row>
              </template>
            </template>
            <template #about>
              <AppDetailsCard :title="$t('__titleAbout')">
                <template #body>
                  <AppDisplayField :item="state.workflow.displayFieldDefinitionComment" />
                </template>
              </AppDetailsCard>
            </template>
          </AppTabs>
        </v-col>
      </v-row>
      <!-- Use v-show to prevent component re-renders -->
      <v-row
        v-show="!state.isEditable"
        no-gutters
      >
        <template v-if="!state.workflowExecution?.stopTs">
          <v-col
            id="execution-progress"
            :cols="12"
          >
            <WorkflowExecutionProgressCard
              :use-workflow-options="{ singleton: false }"
              :workflow="state.workflow"
              :workflow-execution="state.workflowExecution"
            />
          </v-col>
        </template>
        <v-col :cols="12">
          <AppTabs
            :items="tabItems"
            :append-query="false"
            :preload-tabs="['activities']"
          >
            <template #general>
              <AppDetailsCard :display-fields="state.workflowExecution.displayFields">
                <template #actions>
                  <AppDialog :on-submit="edit">
                    <template #activator="{ onOpen }">
                      <AppIconButton
                        icon="mdi-pencil"
                        variant="text"
                        :tooltip="$t('__actionEdit')"
                        @click="onOpen"
                      />
                    </template>
                    <template #body="{ onSubmit, onCancel }">
                      <WorkflowExecutionConfigForm
                        :execution="state.workflowExecution"
                        :on-submit="onSubmit"
                        :on-cancel="onCancel"
                      />
                    </template>
                  </AppDialog>
                </template>
              </AppDetailsCard>
            </template>
            <template #streaming-output>
              <WorkflowExecutionStreamingOutputCard
                :execution-arn="route.params.executionArn"
                :has-streaming-action="state.workflow.hasStreamingAction"
              />
            </template>
            <template #events>
              <v-row>
                <v-col :cols="12">
                  <WorkflowExecutionHistoryCard :execution-arn="route.params.executionArn" />
                </v-col>
              </v-row>
            </template>
            <template #progress>
              <WorkflowExecutionProgressCard
                :use-workflow-options="{ singleton: false }"
                :workflow="state.workflow"
                :workflow-execution="state.workflowExecution"
              />
            </template>
          </AppTabs>
        </v-col>
      </v-row>
    </div>
  </template>
  <template v-else-if="state.workflowPending || state.workflowExecutionPending">
    <AppDetailPageLoader :title="$t('__fieldInput')" />
  </template>
  <template v-else>
    <template v-if="state.workflowError">
      <ResourceErrorCard
        :label="$t('__fieldWorkflow')"
        :status-code="400"
      />
    </template>
    <template v-else-if="state.workflowExecutionError">
      <ResourceErrorCard
        :label="$t('__fieldExecution')"
        :status-code="400"
      />
    </template>
  </template>
</template>

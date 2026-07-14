<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';
import { WorkflowExecution } from '~/models/server/workflowExecution';

/**
 * @import { Workflow } from '~/models/server/workflow';
 * @import { WorkflowExecution } from '~/models/server/workflowExecution';
 */

const { t } = useI18n();
const dayjs = useDayjs();
const route = useRoute();
const server = useServer();
const { openInNewTab } = useNavigation();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { createSignal: createWorkflowSignal } = useAbortController();
const { createSignal: createWorkflowExecutionSignal } = useAbortController();

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
  isStopping: false,
});

const clientCodeFormData = computed(() => WorkflowExecution.toRequestPayload({
  workflowId: state.workflow?.id,
  name: `${state.workflow?.id}-${strUtils.generateRandom(6)}-${dayjs().unix()}`,
  displayName: strUtils.generateRandom(12).toUpperCase(),
  stateMemoryInputSelector: state.workflow?.stateMemoryInputSelector,
  input: state.workflowExecution.input,
  useExternalMemoryInput: state.workflow?.useExternalMemoryInput,
}));

const tabItems = computed(() => {
  const workflowUpdatedTs = state.workflow?.updatedTs;
  const executionWorkflowDefinition = state.workflowExecution?.workflowDefinition;
  const executionStopTs = state.workflowExecution?.stopTs;
  return [
    { title: t('__titleGeneral'), value: 'general' },
    { title: t('__titleHistory'), value: 'events' },
    { title: t('__fieldExecutionFlow'), value: 'progress', isHidden: !executionStopTs || (!executionWorkflowDefinition && workflowUpdatedTs > executionStopTs) },
  ];
});

breadcrumbStore.setLoading(true);

const fetchWorkflow = async () => {
  const signal = createWorkflowSignal();

  state.workflowPending = true;
  try {
    const { data, error } = await server.workflow.get({
      workflowId: route.params.id,
    }, {
      lazy: false,
      signal,
      onResponse: ({ _data }) => {
        breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
        breadcrumbStore.setLoading(false);
      },
    });
    if (signal.aborted) return;

    if (error.value) {
      state.workflowError = error.value.data;
      return;
    }
    state.workflow = data.value;
  } finally {
    state.workflowPending = false;
  }
};

const fetchWorkflowExecution = async () => {
  const signal = createWorkflowExecutionSignal();

  state.workflowExecutionPending = true;
  try {
    const { data, error } = await server.workflowExecution.get({ executionArn: route.params.executionArn }, {
      lazy: false,
      signal,
    });
    if (signal.aborted) return;

    if (error.value) {
      state.workflowExecutionError = error.value.data;
      return;
    }
    state.workflowExecution = data.value;
  } finally {
    state.workflowExecutionPending = false;
  }
};

const stop = async () => {
  state.isStopping = true;
  const { error } = await server.workflowExecution.stop({ executionArn: state.workflowExecution.executionArn });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionStop');
  // Delay to allow the stop operation to complete
  await delay(1000);
  state.isStopping = false;
  fetchWorkflowExecution();
};

const edit = async (formData) => {
  const { error } = await server.workflowExecution.update({ executionArn: state.workflowExecution.executionArn, displayName: formData.displayName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionEdit');
  fetchWorkflowExecution();
};

fetchWorkflow();
if (route.params.id === arnUtils.getWorkflowId(route.params.executionArn)) {
  fetchWorkflowExecution();
}
</script>

<template>
  <template v-if="state.workflowPending || state.workflowExecutionPending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="state.workflow && state.workflowExecution">
      <ResourceInfoTitle :title="state.workflowExecution.id" />
      <AppTabs :items="tabItems">
        <template #general>
          <v-row>
            <v-col :cols="12">
              <AppDetailsCard :display-fields="state.workflowExecution.displayFields">
                <template #append-actions>
                  <WorkflowClientCodeButton :form-data="clientCodeFormData" />
                </template>
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
                  <template v-if="state.workflowExecution?.status === StatusConstant.Runtime.RUNNING.value">
                    <AppIconButton
                      icon="mdi-stop-circle"
                      variant="text"
                      :loading="state.isStopping"
                      :tooltip="$t('__actionStop')"
                      @click="stop()"
                    />
                  </template>
                  <template v-else>
                    <AppIconButton
                      icon="mdi-play-circle"
                      variant="text"
                      :tooltip="$t('__actionExecuteAgain')"
                      @click="openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, state.workflow.id)}/execute/${state.workflowExecution.executionArn}`)"
                    />
                  </template>
                </template>
              </AppDetailsCard>
            </v-col>
            <v-col :cols="12">
              <AppDetailsCard :title="$t('__fieldInput')">
                <template #body>
                  <AppDisplayField
                    :item="(
                      state.workflowExecution
                        .setInputSchema(state.workflow.inputSchema)
                        .setWorkflowName(state.workflow.name)
                        .getInputDisplayField()
                    )"
                  />
                </template>
              </AppDetailsCard>
            </v-col>
            <v-col :cols="12">
              <AppDetailsCard :title="$t('__fieldOutput')">
                <template #body>
                  <AppDisplayField
                    :item="(
                      state.workflowExecution
                        .setOutputSchema(state.workflow.outputSchema)
                        .setWorkflowName(state.workflow.name)
                        .getOutputDisplayField()
                    )"
                  />
                </template>
              </AppDetailsCard>
            </v-col>
          </v-row>
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
            :workflow="state.workflow"
            :workflow-execution="state.workflowExecution"
          />
        </template>
        <template #append>
          <div class="d-flex align-center justify-end ga-2">
            <AppButton
              :text="$t('__actionRunApp')"
              append-icon="mdi-open-in-new"
              class="primary-gradient"
              @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, state.workflow.id)}/execute`)"
            />
          </div>
        </template>
      </AppTabs>
    </template>
    <template v-else-if="state.workflow && !state.workflowExecution">
      <ResourceErrorCard
        :label="$t('__fieldExecution')"
        :status-code="400"
      />
    </template>
    <template v-else-if="state.workflowError || state.workflowExecutionError">
      <ResourceErrorCard
        :label="state.workflowError ? $t('__fieldWorkflow') : $t('__fieldExecution')"
        :status-code="state.workflowError ? state.workflowError.status : state.workflowExecutionError.status"
      />
    </template>
  </template>
</template>

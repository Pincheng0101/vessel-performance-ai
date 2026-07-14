<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';
import { WorkflowExecution } from '~/models/server/workflowExecution';

const dayjs = useDayjs();
const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const workflowExecutionStore = useWorkflowExecutionStore();

definePageMeta({
  layout: 'execute',
});

breadcrumbStore.setLoading(true);

const { data } = await server.workflow.get({
  workflowId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const start = async (formData) => {
  const workflowExecution = new WorkflowExecution({
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
      return;
    }
    executionData = data.value;
  } else {
    const { data, error } = await server.workflowExecution.start({
      ...formData,
      workflowId: route.params.id,
    });
    if (error.value) {
      return;
    }
    executionData = data.value;
  }
  Object.assign(workflowExecution, {
    executionArn: executionData.executionArn,
    displayName: formData.displayName,
    status: StatusConstant.Runtime.RUNNING.value,
    startTs: dayjs().unix(),
  });
  workflowExecutionStore.prependWorkflowExecution(workflowExecution);
  snackbarStore.setActionSuccess('__actionStart');
  await navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute/${executionData.executionArn}`);
  await delay(1000);
  scrollUtils.scrollToElementById('#execution-progress', 64 + 8);
};
</script>

<template>
  <template v-if="data">
    <div class="d-flex align-center justify-space-between py-5">
      <v-sheet
        color="transparent"
        :height="36"
        class="d-flex align-center"
      >
        <div class="d-flex align-center text-h5 font-weight-bold ga-2">
          <template v-if="data.workflowName">
            {{ data.workflowName }}
            <WorkflowInfoMenu :workflow="data" />
          </template>
          <template v-else>
            <AppSkeletonLoader
              :width="400"
              background-color="transparent"
              type="heading"
            />
          </template>
        </div>
      </v-sheet>
    </div>
    <AppTabs
      :items="[
        { title: $t('__titleExecute'), value: 'execute' },
        { title: $t('__titleAbout'), value: 'about' },
      ]"
    >
      <template #execute>
        <WorkflowExecutionForm
          :form-title="$t('__titleNewExecution')"
          :input-schema="data.inputSchema"
          :use-external-memory-input="data.useExternalMemoryInput"
          :state-memory-input-selector="data.stateMemoryInputSelector"
          :on-submit="start"
        />
      </template>
      <template #about>
        <AppDetailsCard :title="$t('__titleAbout')">
          <template #body>
            <AppDisplayField :item="data.displayFieldDefinitionComment" />
          </template>
        </AppDetailsCard>
      </template>
    </AppTabs>
  </template>
</template>

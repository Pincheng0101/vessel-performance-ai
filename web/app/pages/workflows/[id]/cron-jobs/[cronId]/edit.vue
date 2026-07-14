<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const { hasWritePermission } = useResourcePermission();

const state = reactive({
  hasPermission: null,
});

state.hasPermission = await hasWritePermission(ResourceConstant.Type.WORKFLOW.value);

const { data: workflowData } = await server.workflow.get({
  workflowId: route.params.id,
});

const { data: cronJobData, pending, error } = await server.workflowCron.get({
  workflowId: route.params.id,
  workflowCronId: route.params.cronId,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.cronId, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const mergedCronJobData = computed(() => {
  if (!cronJobData.value || !workflowData.value?.inputSchema) {
    return cronJobData.value;
  }
  const raw = objUtils.toRaw(cronJobData.value);
  return {
    ...raw,
    stateInput: objUtils.fillByTemplate(
      jsonSchemaUtils.generateTemplate(workflowData.value.inputSchema),
      raw.stateInput ?? {},
    ),
  };
});

const edit = async (formData) => {
  const { error } = await server.workflowCron.update({
    workflowId: route.params.id,
    workflowCronId: route.params.cronId,
    ...formData,
    stateInput: formData.stateInput && Object.keys(formData.stateInput).length > 0 ? formData.stateInput : null,
  });
  if (error.value) {
    return;
  }
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs/${route.params.cronId}`, { replace: true });
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__titleSchedule')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="cronJobData && workflowData">
    <WorkflowCronJobForm
      :resource="mergedCronJobData"
      :input-schema="workflowData.inputSchema"
      :on-submit="edit"
    />
  </template>
</template>

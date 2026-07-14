<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();

breadcrumbStore.setLoading(true);

const { data } = await server.workflow.get({
  workflowId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const create = async (formData) => {
  const { data, error } = await server.workflowCron.create({
    workflowId: route.params.id,
    ...formData,
  });
  if (error.value) {
    return;
  }
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs/${data.value.id}`);
};
</script>

<template>
  <template v-if="data">
    <WorkflowCronJobForm
      :input-schema="data.inputSchema"
      :hidden-fields="['status']"
      :on-submit="create"
    />
  </template>
</template>

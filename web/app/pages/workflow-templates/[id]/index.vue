<script setup>
import { Workflow } from '~/models/server/workflow';
import { WorkflowDefinition } from '~/models/workflow/state';

definePageMeta({
  middleware: [
    'workflow-template-access',
  ],
});

const route = useRoute();
const server = useServer();
const {
  isWorkflowResourceKey,
  deleteTemplate,
  importWorkflowDefinition,
} = useWorkflowTemplate();
const breadcrumbStore = useBreadcrumbStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.workflowTemplate.get({
  workflowTemplateId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const workflow = computed(() => {
  const createRequest = Object.entries(data.value?.workflowDefinition.resources)
    .find(([key]) => isWorkflowResourceKey(key, data.value.workflowDefinition.workflowDefinitionName))[1].createRequest;
  return new Workflow({
    ...createRequest,
    definition: WorkflowDefinition.createFromAsl(createRequest.definition),
  });
});

const handleTemplateDelete = async ({ workflowTemplateId }) => {
  const { error } = await deleteTemplate({ workflowTemplateId });
  if (error) {
    return;
  }
  navigateTo('/workflow-templates');
};
</script>

<template>
  <template v-if="pending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceInfoTitle :title="data.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="data"
            :type="data.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__titleAbout'), value: 'about' },
        ]"
      >
        <template #general>
          <v-row>
            <v-col :cols="12">
              <ResourceDetailsCard
                :item="data"
                :item-label="$t('__titleWorkflowTemplate')"
                :on-delete="handleTemplateDelete"
              />
            </v-col>
            <v-col :cols="12">
              <WorkflowReadonlyCard :workflow="workflow" />
            </v-col>
          </v-row>
        </template>
        <template #about>
          <AppDetailsCard :title="$t('__titleAbout')">
            <template #body>
              <AppDisplayField :item="data.displayFieldDescription" />
            </template>
          </AppDetailsCard>
        </template>
        <template #append>
          <AppDialog :on-submit="(formData) => importWorkflowDefinition(formData)">
            <template #activator="{ onOpen }">
              <AppButton
                :text="$t('__actionUse')"
                class="primary-gradient"
                width="120"
                @click.stop="onOpen"
              />
            </template>
            <template #body="{ onSubmit, onCancel }">
              <WorkflowCreateFromTemplateForm
                :workflow-definition="data.workflowDefinition"
                :on-submit="onSubmit"
                :on-cancel="onCancel"
              />
            </template>
          </AppDialog>
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__titleWorkflowTemplate')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

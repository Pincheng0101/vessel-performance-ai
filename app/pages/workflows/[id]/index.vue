<script setup>
import { IconConstant, ResourceConstant } from '~/constants';
import { UiData, WorkflowDraftValue } from '~/models/server/uiData';
import { WorkflowExecution } from '~/models/server/workflowExecution';

/**
 * @import { Resource } from '~/models/server';
 */

const dayjs = useDayjs();
const route = useRoute();
const server = useServer();
const { openInNewTab } = useNavigation();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.workflow.get({
  workflowId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ workflowId }) => {
  const { error } = await server.workflow.destroy({ workflowId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.workflow.duplicate({
    workflowId: route.params.id,
    newWorkflowName: resource.name,
  });
  if (error.value) {
    return;
  }
  const { data: draftData } = await server.uiData.get({
    key: `draft-${route.params.id}`,
  });
  if (draftData.value) {
    await server.uiData.set(new UiData({
      key: `draft-${data.value.id}`,
      value: new WorkflowDraftValue({
        ...draftData.value.value,
        updatedTs: dayjs().unix(),
      }),
    }));
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, data.value.id));
};

const clientCodeFormData = computed(() => WorkflowExecution.toRequestPayload({
  workflowId: route.params.id,
  name: `${route.params.id}-${strUtils.generateRandom(6)}-${dayjs().unix()}`,
  displayName: strUtils.generateRandom(12).toUpperCase(),
  stateMemoryInputSelector: data.value?.stateMemoryInputSelector,
  input: jsonSchemaUtils.generateTemplate(data.value?.inputSchema),
  useExternalMemoryInput: data.value?.useExternalMemoryInput,
}));
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
          { title: $t('__fieldExecution', 2), value: 'executions' },
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
          { title: $t('__titleSchedule', 2), value: 'cron-jobs' },
        ]"
      >
        <template #general>
          <v-row>
            <v-col :cols="12">
              <ResourceDetailsCard
                :item="data"
                :module="ResourceConstant.Type.WORKFLOW.module"
                :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, data.id)}/edit`"
                :item-label="$t('__fieldWorkflow')"
                :allow-delete-recursively="ResourceConstant.Type.WORKFLOW.allowDeleteRecursively"
                :allow-validate="ResourceConstant.Type.WORKFLOW.allowValidate"
                :on-duplicate="handleDuplicate"
                :on-delete="handleDelete"
              >
                <template #before-delete-actions>
                  <AppIconButton
                    :aria-label="$t('__actionViewUsageAnalysis')"
                    :icon="IconConstant.Base.USAGE"
                    variant="text"
                    :tooltip="$t('__actionViewUsageAnalysis')"
                    :on-click="() => navigateTo(`/usage/workflows/${data.id}`)"
                  />
                  <WorkflowClientCodeButton :form-data="clientCodeFormData" />
                </template>
              </ResourceDetailsCard>
            </v-col>
            <v-col :cols="12">
              <WorkflowReadonlyCard
                :workflow="data"
                :height="400"
              />
            </v-col>
            <v-col :cols="12">
              <AppDetailsCard :title="$t('__fieldInputSchema')">
                <template #body>
                  <AppDisplayField :item="data.displayFieldInputSchema" />
                </template>
              </AppDetailsCard>
            </v-col>
            <v-col :cols="12">
              <AppDetailsCard :title="$t('__fieldOutputSchema')">
                <template #body>
                  <AppDisplayField :item="data.displayFieldOutputSchema" />
                </template>
              </AppDetailsCard>
            </v-col>
            <v-col :cols="12">
              <AppDetailsCard :title="$t('__fieldDefinition')">
                <template #body>
                  <AppDisplayFieldGroup
                    :items="[data.displayFieldDefinition]"
                    hide-label
                  />
                </template>
              </AppDetailsCard>
            </v-col>
          </v-row>
        </template>
        <template #about>
          <AppDetailsCard :title="$t('__titleAbout')">
            <template #body>
              <AppDisplayField :item="data.displayFieldDefinitionComment" />
            </template>
          </AppDetailsCard>
        </template>
        <template #executions>
          <WorkflowExecutionList />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.WORKFLOW.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.WORKFLOW.value"
          />
        </template>
        <template #cron-jobs>
          <WorkflowCronJobList />
        </template>
        <template #append>
          <div class="d-flex align-center justify-end ga-2">
            <AppButton
              :text="$t('__actionRunApp')"
              append-icon="mdi-open-in-new"
              class="primary-gradient"
              @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, data.id)}/execute`)"
            />
          </div>
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldWorkflow')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

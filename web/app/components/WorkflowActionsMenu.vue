<script setup>
import { IconConstant, ResourceConstant } from '~/constants';
import { Workflow } from '~/models/server/workflow';

const props = defineProps({
  workflow: {
    type: Workflow,
    required: true,
  },
  onWorkflowUpdate: {
    type: Function,
    default: () => {},
  },
  onWorkflowRestore: {
    type: Function,
    default: () => {},
  },
});

const route = useRoute();
const { t } = useI18n();
const { openInNewTab } = useNavigation();
const {
  canDownloadWorkflowDefinition,
  canPublishTemplate,
  downloadWorkflowDefinition,
} = useWorkflowTemplate();

const state = reactive({
  isLoading: false,
});

const items = computed(() => [
  {
    title: t('__actionRunApp'),
    value: 'runApp',
    icon: 'mdi-play',
    enabled: true,
    callback: openExecutionPage,
    showDividerAfter: true,
  },
  {
    title: t('__actionPublishTemplate'),
    value: 'publishTemplate',
    icon: 'mdi-package-up',
    enabled: canPublishTemplate(props.workflow.resourceType),
    component: 'WorkflowTemplatePublishDialog',
    showDividerAfter: false,
  },
  {
    title: t('__actionDownloadDefinition'),
    value: 'downloadWorkflowDefinition',
    icon: 'mdi-file-download',
    enabled: canDownloadWorkflowDefinition(props.workflow.resourceType),
    callback: () => downloadWorkflowDefinition(props.workflow),
    showDividerAfter: false,
  },
  {
    title: t('__actionSetupSchedule'),
    value: 'setupCronJob',
    icon: IconConstant.Base.CRON_JOB,
    enabled: true,
    callback: openCronJobPage,
    showDividerAfter: false,
  },
]);

const enabledItems = computed(() => items.value.filter(item => item.enabled));

const openExecutionPage = () => {
  openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/execute`);
};

const openCronJobPage = () => {
  openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}/cron-jobs`);
};

const update = async () => {
  state.isLoading = true;
  await props.onWorkflowUpdate();
  state.isLoading = false;
};
</script>

<template>
  <v-menu
    :close-on-content-click="false"
    :offset="8"
  >
    <template #activator="{ props: p }">
      <AppButton
        v-bind="p"
        append-icon="mdi-chevron-down"
        size="small"
        :width="100"
        color="primary"
        :text="$t('__workflowButtonActions')"
      />
    </template>
    <v-card
      :elevation="1"
      rounded="lg"
    >
      <v-card-text>
        <div class="mb-2 text-body-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <p class="text-body-1 font-weight-bold d-flex align-center ga-2">
              <v-icon
                icon="mdi-clock-outline"
                size="small"
                color="primary"
              />
              {{ $t('__titleLatestUpdated') }}
            </p>
            <AppDialog :on-submit="props.onWorkflowRestore">
              <template #activator="{ onOpen }">
                <AppButton
                  :text="$t('__actionRestore')"
                  :width="60"
                  size="x-small"
                  variant="outlined"
                  color="primary"
                  @click="onOpen"
                />
              </template>
              <template #body="{ onSubmit, onCancel }">
                <v-card>
                  <v-card-title>
                    {{ $t('__titleModifyItem', { action: $t('__actionRestore'), item: $t('__fieldWorkflow') }) }}
                  </v-card-title>
                  <v-divider />
                  <v-card-text>
                    {{ $t('__instructionWorkflowRestore') }}
                  </v-card-text>
                  <v-card-actions class="justify-end">
                    <AppButton
                      :text="$t('__actionCancel')"
                      :width="100"
                      color="actionButton"
                      @click="onCancel"
                    />
                    <AppButton
                      :text="$t('__actionRestore')"
                      :width="100"
                      color="primary"
                      @click="onSubmit"
                    />
                  </v-card-actions>
                </v-card>
              </template>
            </AppDialog>
          </div>
          <AppTimestamp
            :prefix="$t('__titleUpdated')"
            :value="props.workflow.updatedTs"
            :enable-tooltip="false"
          />
        </div>
        <AppButton
          :text="$t('__actionUpdate')"
          :width="240"
          color="primary"
          variant="flat"
          :loading="state.isLoading"
          @click="update"
        />
      </v-card-text>
      <template v-if="enabledItems.length > 0">
        <v-divider />
        <v-list class="py-0">
          <template
            v-for="(item, i) in enabledItems"
            :key="item.title"
          >
            <template v-if="!item.component">
              <v-list-item
                :rounded="false"
                class="text-body-2 font-weight-bold px-5"
                @click="item.callback"
              >
                <v-icon
                  :icon="item.icon"
                  size="small"
                  color="primary"
                  class="mr-2"
                />
                {{ item.title }}
              </v-list-item>
            </template>
            <template v-else-if="item.component === 'WorkflowTemplatePublishDialog'">
              <WorkflowTemplatePublishDialog :resource="props.workflow">
                <template #activator="{ onOpen }">
                  <v-list-item
                    class="text-body-2 font-weight-bold px-5"
                    @click="onOpen"
                  >
                    <v-icon
                      :icon="item.icon"
                      size="small"
                      color="primary"
                      class="mr-2"
                    />
                    {{ item.title }}
                  </v-list-item>
                </template>
              </WorkflowTemplatePublishDialog>
            </template>
            <v-divider v-if="item.showDividerAfter && i < enabledItems.length - 1" />
          </template>
        </v-list>
      </template>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
:deep(.v-list-item__content) {
  display: flex;
  align-items: center;
}
</style>

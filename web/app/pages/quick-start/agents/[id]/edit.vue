<script setup>
import { IconConstant, LoaderConstant, ResourceConstant, StatusConstant } from '~/constants';
import { Agent } from '~/models/server/agent';
import { ProgressBoardItem } from '~/models/ui/progressBoard';
import { Step } from '~/models/ui/stepper';

definePageMeta({
  layout: 'fluid', // For better visual experience
});

const route = useRoute();
const { t } = useI18n();
const server = useServer();
const { openInNewTab } = useNavigation();
const breadcrumbStore = useBreadcrumbStore();
const { hasWritePermission } = useResourcePermission();
const {
  dependencies,
  fetchDependencies,
} = useResourceDependency();
const {
  startSyncJob,
  uploadFilesToStorage,
} = useAgentConfig();
const {
  state: storageState,
  storageTableItems,
  initializeStorage,
  fetchStorageObjects,
  handleFilesSelect,
  createPendingFolder,
  handleStorageItemClick,
  handleDeleteStorageObject,
  handleRestoreStorageObject,
  handleDownloadStorageObject,
  applyStorageDatasetChanges,
} = useAgentConfigStorage({ uploadFilesToStorage });
const {
  enableConfirmation,
  disableConfirmation,
} = useLeaveConfirmation();

const firstForm = ref(null);

const state = reactive({
  hasPermission: null,
  agent: null,
  error: {},
  step: 1,
  roleFormData: {},
  isPromptRewriting: false,
  loaderId: null,
  syncJobId: null,
  hasStorageChangesApplied: false,
  refreshChatRoom: 0,
});

const PROGRESS_BOARD_ITEM_KEY = Object.freeze({
  AGENT_ROLE_UPDATE: 'agent_role_update',
  DATASET_UPDATE: 'dataset_update',
  APPLY_CHANGES: 'apply_changes',
});
const PROGRESS_VISUAL_DELAY_MS = 2000;

const hasRoleChanges = computed(() => JSON.stringify(state.roleFormData) !== JSON.stringify(state.agent));
const hasStorageDatasetChanges = computed(() => {
  return storageState.pendingUploadFiles.length > 0
    || storageState.pendingDeleteObjectPaths.length > 0
    || storageState.pendingCreateCommonPrefixes.length > 0;
});
const hasSyncJobStarted = computed(() => !!state.syncJobId);
const syncJobUrl = computed(() => {
  if (!state.loaderId || !state.syncJobId) return '';
  return `${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, state.loaderId)}/sync-jobs/${state.syncJobId}`;
});

const getProgressItemTitle = (title, shouldSkip) => shouldSkip
  ? `${title}（${t('__instructionNoChangesSkipUpdate')}）`
  : title;

const markSkipped = key => setStatusCanceled(key);

const markSkippedWithDelay = async (key) => {
  setStatusProcessing(key);
  await delay(PROGRESS_VISUAL_DELAY_MS);
  markSkipped(key);
};

const runAgentRoleUpdateProgress = async () => {
  if (!hasRoleChanges.value) {
    await markSkippedWithDelay(PROGRESS_BOARD_ITEM_KEY.AGENT_ROLE_UPDATE);
    return false;
  }
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.AGENT_ROLE_UPDATE);
  await delay(PROGRESS_VISUAL_DELAY_MS);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.AGENT_ROLE_UPDATE);
  return true;
};

const runDatasetUpdateProgress = async () => {
  if (!hasStorageDatasetChanges.value) {
    state.hasStorageChangesApplied = false;
    await markSkippedWithDelay(PROGRESS_BOARD_ITEM_KEY.DATASET_UPDATE);
    return false;
  }
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.DATASET_UPDATE);
  try {
    const hasChanges = await applyStorageDatasetChanges();
    state.hasStorageChangesApplied = hasChanges;
    await delay(PROGRESS_VISUAL_DELAY_MS);
    setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.DATASET_UPDATE);
    return hasChanges;
  } catch (error) {
    state.hasStorageChangesApplied = false;
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.DATASET_UPDATE);
    throw new Error(error.message || t('__stepperSubtitleRerunToContinue'));
  }
};

const runApplyChangesProgress = async () => {
  const shouldUpdateAgent = hasRoleChanges.value;
  const shouldStartSync = state.hasStorageChangesApplied && !!state.loaderId;

  if (!shouldUpdateAgent && !shouldStartSync) {
    await markSkippedWithDelay(PROGRESS_BOARD_ITEM_KEY.APPLY_CHANGES);
    return false;
  }

  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.APPLY_CHANGES);

  if (shouldUpdateAgent) {
    const resource = new Agent({
      ...state.agent,
      agentId: route.params.id,
      agentName: state.roleFormData.agentName,
      agentPrompt: state.roleFormData.agentPrompt,
      uiConfig: state.roleFormData.uiConfig,
    });
    const { error } = await server.agent.update(resource);
    if (error.value) {
      state.error = error.value.data;
      setStatusFailed(PROGRESS_BOARD_ITEM_KEY.APPLY_CHANGES);
      throw new Error(t('__stepperSubtitleRerunToContinue'));
    }
  }

  if (shouldStartSync) {
    const syncJob = await startSyncJob(state.loaderId);
    state.syncJobId = syncJob?.id;
  }

  await delay(PROGRESS_VISUAL_DELAY_MS);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.APPLY_CHANGES);
  return true;
};

const fetchAgentDependencies = async () => {
  await fetchDependencies({
    resourceType: ResourceConstant.Type.AGENT.value,
    resourceId: route.params.id,
  });

  const storageDependency = dependencies.value.find(item => item.resourceType === ResourceConstant.Type.STORAGE.value);
  const loaderDependency = dependencies.value.find(item => item.resourceType === ResourceConstant.Type.LOADER.value);

  state.loaderId = loaderDependency?.resourceId;
  await initializeStorage(storageDependency?.resourceId);
};

const submit = async () => {
  state.hasStorageChangesApplied = false;
  state.syncJobId = null;
  await runAgentRoleUpdateProgress();
  await runDatasetUpdateProgress();
  await runApplyChangesProgress();
  disableConfirmation();
  state.refreshChatRoom += 1;
};

const stepperConfig = computed(() => [
  new Step({
    value: 1,
    title: t('__titleAgentRole'),
    subtitle: t('__stepperSubtitleAgentRole'),
    onValidate: async () => {
      if (!(await firstForm.value.validate()).valid) {
        throw new Error(t('__stepperSubtitleCompleteRequiredFields'));
      }
    },
  }),
  new Step({
    value: 2,
    title: t('__titleKnowledgeIntegration'),
    subtitle: t('__stepperSubtitleKnowledgeIntegration'),
    i18nAction: '__actionSave',
    progressBoardItems: [
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.AGENT_ROLE_UPDATE,
        title: getProgressItemTitle(t('__titleModifyItem', { action: t('__actionUpdate'), item: t('__titleAgentRole') }), !hasRoleChanges.value),
        errorMessage: t('__titleModifyFailed', { action: t('__actionUpdate') }).toLowerCase(),
        onRun: runAgentRoleUpdateProgress,
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.DATASET_UPDATE,
        title: getProgressItemTitle(t('__titleModifyItem', { action: t('__actionUpdate'), item: t('__fieldDataset') }), !hasStorageDatasetChanges.value),
        errorMessage: t('__titleModifyFailed', { action: t('__actionUpdate') }).toLowerCase(),
        onRun: runDatasetUpdateProgress,
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.APPLY_CHANGES,
        title: getProgressItemTitle(t('__actionApplyChanges'), !(hasRoleChanges.value || hasStorageDatasetChanges.value)),
        errorMessage: t('__titleModifyFailed', { action: t('__actionUpdate') }).toLowerCase(),
        onRun: runApplyChangesProgress,
      }),
    ],
    onNext: submit,
  }),
  new Step({
    value: 3,
    title: t('__titleModifySuccessfully', { action: t('__actionUpdate') }),
    subtitle: t('__stepperSubtitleAgentUpdated'),
    hideButtons: true,
  }),
]);

const {
  steps,
  setStatusProcessing,
  setStatusSucceeded,
  setStatusFailed,
  setStatusCanceled,
} = useStepper(stepperConfig);

const discard = () => {
  disableConfirmation();
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, route.params.id));
};

state.hasPermission = await hasWritePermission(ResourceConstant.Type.AGENT.value);
breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.agent.get({
  agentId: route.params.id,
}, {
  onResponse: async ({ _data }) => {
    state.agent = _data;
    state.roleFormData = { ...objUtils.toRaw(_data) };
    breadcrumbStore.setBreadcrumb(route.params.id, _data.agentName);
    breadcrumbStore.setLoading(false);
    await fetchAgentDependencies();
  },
});

enableConfirmation();
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="state.hasPermission && !error">
    <AppSplitPane storage-key="agent-edit-pane-ratio">
      <template #left>
        <AppStepper
          v-model="state.step"
          :steps="steps"
          :stepper-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: $t(ResourceConstant.Type.AGENT.i18nTitle) })"
          :icon="IconConstant.Base.AGENT_BUILDER"
          :is-next-step-button-disabled="state.isPromptRewriting"
          :is-previous-step-button-disabled="state.isPromptRewriting"
          :is-all-steps-disabled="state.isPromptRewriting"
        >
          <template #step-actions-left="{ isLoading }">
            <AppDiscardButton
              :disabled="isLoading || state.isPromptRewriting"
              :on-discard="discard"
            />
          </template>
          <template #step-content-1>
            <ResourceAgentConfigRoleForm
              ref="firstForm"
              v-model:form-data="state.roleFormData"
              v-model:is-prompt-rewriting="state.isPromptRewriting"
            />
          </template>
          <template #step-content-2>
            <div class="d-flex flex-column ga-4">
              <template v-if="storageState.storageId">
                <AppInputGroup
                  :label="$t('__fieldDataset')"
                  required
                >
                  <ResourceAgentConfigStorageObjectList
                    v-model:common-prefix="storageState.currentPrefix"
                    :loading="storageState.isLoadingStorageObjects"
                    :items="storageTableItems"
                    :storage="storageState.storage"
                    :storage-objects="storageState.storageObjects"
                    :supported-extensions="LoaderConstant.Type.UNSUPERVISED.supportedFileExtensions"
                    :on-storage-refresh="fetchStorageObjects"
                    :on-storage-item-click="handleStorageItemClick"
                    :on-storage-object-delete="handleDeleteStorageObject"
                    :on-storage-object-restore="handleRestoreStorageObject"
                    :on-storage-object-download="handleDownloadStorageObject"
                    :on-files-select="handleFilesSelect"
                    :on-pending-folder-create="createPendingFolder"
                  />
                </AppInputGroup>
              </template>
              <AppInfoCard
                v-else
                :title="$t('__titleResourceNotFound', { resource: $t('__fieldStorage') })"
                :instruction="$t('__instructionResourceStorage')"
                :icon="ResourceConstant.Type.STORAGE.icon"
              />
            </div>
          </template>
          <template #step-content-3>
            <AppInfoCard
              :title="hasSyncJobStarted ? $t('__titleUpdateSuccessSyncingData') : $t('__titleModifySuccessfully', { action: $t('__actionUpdate') })"
              :instruction="hasSyncJobStarted ? $t('__instructionAgentDatasetSyncing') : $t('__instructionAgentUpdated')"
              :icon="ResourceConstant.Type.AGENT.icon"
            >
              <template #actions>
                <div class="d-flex flex-column align-center ga-2">
                  <AppButton
                    :text="$t('__actionStartConversation')"
                    size="large"
                    class="px-4"
                    color="primary"
                    prepend-icon="mdi-chat"
                    @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, route.params.id)}/chat`)"
                  />
                  <p
                    v-if="hasSyncJobStarted"
                    class="text-caption text-decoration-underline cursor-pointer mb-0"
                    @click="openInNewTab(syncJobUrl)"
                  >
                    {{ $t('__actionGoToSyncJobProgress') }}
                  </p>
                </div>
              </template>
            </AppInfoCard>
          </template>
        </AppStepper>
      </template>
      <template #right>
        <v-card class="chat-room-container">
          <v-card-title>
            {{ $t('__actionChat') }}
            <v-spacer />
            <div class="d-flex align-center ga-2">
              <AppButton
                color="actionButton"
                :text="$t('__actionNewChat')"
                @click="state.refreshChatRoom += 1"
              />
              <AppIconButton
                color="primary"
                icon="mdi-open-in-new"
                @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, data.id)}/chat`)"
              />
            </div>
          </v-card-title>
          <v-card-text class="pa-0">
            <!-- Viewport height offset: card header + padding bottom + footer -->
            <AgentChatRoom
              :key="state.refreshChatRoom"
              :agent-id="data.id"
              :agent="data"
              :viewport-height-offset="60 + 24 + 24"
              background-color="backgroundScale2"
            />
          </v-card-text>
        </v-card>
      </template>
    </AppSplitPane>
  </template>
  <template v-else>
    <ResourceErrorCard
      :label="$t('__fieldAgent')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
</template>

<style lang="scss" scoped>
.chat-room-container {
  position: sticky;
  top: calc(64px + 24px); // Header + padding
  max-height: calc(100dvh - 64px - 24px - 24px - 24px); // 100dvh - app header - padding top - padding bottom - footer
}
</style>

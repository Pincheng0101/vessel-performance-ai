<script setup>
import { AgentConstant, IconConstant, KnowledgeBaseConstant, LlmConstant, LoaderConstant, ResourceConstant, RetrieverConstant } from '~/constants';
import { Agent, AgentToolRetrieval } from '~/models/server/agent';
import { KnowledgeBase } from '~/models/server/knowledgeBase';
import { Loader } from '~/models/server/loader';
import { LoaderSourceFactory } from '~/models/server/loader/loaderSource';
import { Storage } from '~/models/server/storage';
import { UiData } from '~/models/server/uiData';
import { AgentMetadata } from '~/models/ui/agent';
import { ProgressBoardItem } from '~/models/ui/progressBoard';
import { Step } from '~/models/ui/stepper';

definePageMeta({
  alias: [
    '/quick-start',
  ],
});

const server = useServer();
const { t } = useI18n();
const { openInNewTab } = useNavigation();
const {
  enableConfirmation,
  disableConfirmation,
} = useLeaveConfirmation();
const {
  extractDomainFromAgent,
  startSyncJob,
  uploadFilesToStorage: uploadToStorage,
} = useAgentConfig();

const form1 = ref(null);
const form2 = ref(null);

const PROGRESS_BOARD_ITEM_KEY = Object.freeze({
  AGENT_PROMPT_SETUP: 'agent_prompt_setup',
  STORAGE_SETUP: 'storage_setup',
  FILE_UPLOAD: 'file_upload',
  KNOWLEDGE_BASE_SETUP: 'knowledge_base_setup',
  LOADER_SETUP: 'loader_setup',
  AGENT_SETUP: 'agent_setup',
});

const state = reactive({
  step: 1,
  roleFormData: {
    agentName: '',
    agentPrompt: '',
  },
  datasetFormData: {
    files: [],
  },
  storageId: null,
  knowledgeBaseId: null,
  loaderId: null,
  syncJobId: null,
  agentId: null,
  isPromptRewriting: false,
});

const storageName = computed(() => `${state.roleFormData.agentName}_storage`);
const knowledgeBaseName = computed(() => `${state.roleFormData.agentName}_knowledge_base`);
const loaderName = computed(() => `${state.roleFormData.agentName}_loader`);
const syncJobUrl = computed(() => {
  if (!state.loaderId || !state.syncJobId) return '';
  return `${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, state.loaderId)}/sync-jobs/${state.syncJobId}`;
});

const stepperConfig = computed(() => [
  new Step({
    value: 1,
    title: t('__titleAgentRole'),
    subtitle: t('__stepperSubtitleAgentRole'),
    progressBoardItems: [
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.AGENT_PROMPT_SETUP,
        title: t('__titleAgentPromptSetup'),
        subtitle: t('__subtitleAgentPromptSetup'),
      }),
    ],
    onValidate: async () => {
      if (!(await form1.value.validate()).valid) {
        throw new Error(t('__stepperSubtitleCompleteRequiredFields'));
      }
    },
  }),
  new Step({
    value: 2,
    title: t('__titleKnowledgeIntegration'),
    subtitle: t('__stepperSubtitleKnowledgeIntegration'),
    i18nAction: '__actionCreate',
    progressBoardItems: [
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP,
        title: t('__titleStorageSetup'),
        subtitle: t('__subtitleStorageSetup'),
        errorMessage: t('__titleModifyFailed', { action: $t('__actionCreate') }).toLowerCase(),
        onRun: () => createStorage(storageName.value),
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD,
        title: t('__titleFileUpload'),
        subtitle: t('__subtitleFileUpload'),
        errorMessage: t('__titleModifyFailed', { action: $t('__actionUpload') }).toLowerCase(),
        onRun: () => uploadFiles(state.datasetFormData.files),
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP,
        title: t('__titleKnowledgeBaseSetup'),
        subtitle: t('__subtitleKnowledgeBaseSetup'),
        errorMessage: t('__titleModifyFailed', { action: $t('__actionCreate') }).toLowerCase(),
        onRun: () => createKnowledgeBase(knowledgeBaseName.value),
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP,
        title: t('__titleLoaderSetup'),
        subtitle: t('__subtitleLoaderSetup'),
        errorMessage: t('__titleModifyFailed', { action: $t('__actionCreate') }).toLowerCase(),
        onRun: () => createLoader(loaderName.value),
      }),
      new ProgressBoardItem({
        key: PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP,
        title: t('__titleAgentSetup'),
        subtitle: t('__subtitleAgentSetup'),
        errorMessage: t('__titleModifyFailed', { action: $t('__actionCreate') }).toLowerCase(),
        onRun: () => createAgent({
          agentName: state.roleFormData.agentName,
          agentPrompt: state.roleFormData.agentPrompt,
          knowledgeBaseId: state.knowledgeBaseId,
        }),
      }),
    ],
    onValidate: async () => {
      if (!(await form2.value.validate()).valid) {
        throw new Error(t('__stepperSubtitleUploadDataset'));
      }
    },
    onNext: async () => {
      await createStorage(storageName.value);
      await uploadFiles(state.datasetFormData.files || []);
      await createKnowledgeBase(knowledgeBaseName.value);
      await createLoader(loaderName.value);
      await createAgent({
        agentName: state.roleFormData.agentName,
        agentPrompt: state.roleFormData.agentPrompt,
        knowledgeBaseId: state.knowledgeBaseId,
      });
      const syncJob = await startSyncJob(state.loaderId);
      state.syncJobId = syncJob?.id;
      disableConfirmation();
    },
  }),
  new Step({
    value: 3,
    title: t('__titleAgentReady'),
    subtitle: t('__stepperSubtitleAgentReady'),
    hideButtons: true,
  }),
]);

const {
  steps,
  setStatusProcessing,
  setStatusSucceeded,
  setStatusFailed,
} = useStepper(stepperConfig);

const createStorage = async (storageName) => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP);
  const resource = new Storage({
    storageName,
  });
  const { data, error } = await server.storage.create(resource);
  if (error.value) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP);
    throw new Error(t('__stepperSubtitleRerunToContinue'));
  }
  state.storageId = data.value.id;
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP);
};

const uploadFiles = async (files) => {
  if (files.length === 0) return;
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD);
  try {
    await uploadToStorage({
      files,
      storageId: state.storageId,
    });
    setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD);
  } catch (error) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD);
    throw new Error(error.message || t('__stepperSubtitleRerunToContinue'));
  }
};

const createKnowledgeBase = async (knowledgeBaseName) => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
  const resource = new KnowledgeBase({
    knowledgeBaseName,
    knowledgeBaseType: KnowledgeBaseConstant.Type.VECTOR_STORE.value,
  });
  const { data, error } = await server.knowledgeBase.create(resource);
  if (error.value) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
    throw new Error(t('__stepperSubtitleRerunToContinue'));
  }
  state.knowledgeBaseId = data.value.id;
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
};

const createLoader = async (loaderName) => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP);
  const loaderType = LoaderConstant.Type.UNSUPERVISED.value;
  const resource = new Loader({
    loaderName,
    loaderType,
    knowledgeBaseId: state.knowledgeBaseId,
    retrieverIds: [RetrieverConstant.DefaultEmbeddingRetriever.ID],
    sources: [
      LoaderSourceFactory.create({
        sourceType: LoaderConstant.SourceType.STORAGE.value,
        storageId: state.storageId,
        llmId: LlmConstant.DefaultLlm.ID,
        retrieverTemplate: '{{ chunk }}',
      }, loaderType),
    ],
  });
  const { data, error } = await server.loader.create(resource);
  if (error.value) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP);
    throw new Error(t('__stepperSubtitleRerunToContinue'));
  }
  state.loaderId = data.value.id;
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP);
};

const createAgent = async ({
  agentName,
  agentPrompt,
  knowledgeBaseId,
}) => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP);
  const domainExtractionResult = await extractDomainFromAgent({
    name: state.roleFormData.agentName,
    prompt: state.roleFormData.agentPrompt,
  });
  const resource = new Agent({
    agentName,
    agentPrompt,
    llmId: LlmConstant.DefaultLlm.ID,
    tools: [
      new AgentToolRetrieval({
        knowledgeBaseId,
        retrieverIds: [RetrieverConstant.DefaultEmbeddingRetriever.ID],
        description: AgentConstant.DefaultParams.RETRIEVAL.descriptionTemplate.replaceAll('`{{ domain_name }}`', domainExtractionResult?.actionOutput?.message),
      }),
    ],
  });
  const { data, error } = await server.agent.create(resource);
  if (error.value) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP);
    throw new Error(t('__stepperSubtitleRerunToContinue'));
  }
  const { error: uiDataError } = await server.uiData.set(new UiData({
    key: AgentMetadata.getUiDataKey(data.value.id),
    value: new AgentMetadata({
      createMode: AgentConstant.CreateMode.FROM_AGENT_BUILDER.value,
      agentBuilderType: AgentConstant.AgentBuilderType.DEFAULT.value,
    }),
  }));
  if (uiDataError.value) {
    console.error('Failed to set UI data for agent metadata:', uiDataError.value);
  }
  state.agentId = data.value.id;
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP);
};

enableConfirmation();
</script>

<template>
  <AppStepper
    v-model="state.step"
    :steps="steps"
    :stepper-title="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldAgent') })"
    :icon="IconConstant.Base.AGENT_BUILDER"
    :is-next-step-button-disabled="state.isPromptRewriting"
    :is-previous-step-button-disabled="state.isPromptRewriting"
    :is-all-steps-disabled="state.isPromptRewriting"
    is-previous-steps-disabled-on-final-step
  >
    <template #step-content-1>
      <ResourceAgentConfigRoleForm
        ref="form1"
        v-model:is-prompt-rewriting="state.isPromptRewriting"
        v-model:form-data="state.roleFormData"
        :hidden-fields="['uiConfig']"
      />
    </template>
    <template #step-content-2>
      <ResourceAgentConfigDatasetForm
        ref="form2"
        v-model:form-data="state.datasetFormData"
      />
    </template>
    <template #step-content-3>
      <AppInfoCard
        :title="$t('__titleUpdateSuccessSyncingData')"
        :instruction="$t('__instructionAgentDatasetSyncing')"
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
              @click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, state.agentId)}/chat`)"
            />
            <p
              v-if="syncJobUrl"
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

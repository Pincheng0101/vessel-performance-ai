<script setup>
import { ActionExecutionConstant, ChatConstant, ContentBlockConstant, StatusConstant } from '~/constants';
import { TextContentBlockActionExecutionPayload } from '~/models/server/contentBlock';
import { LlmActionExecutionPayloadFactory } from '~/models/server/llm';
import { MessageActionExecutionPayload } from '~/models/server/message';
import { LlmPayload } from '~/models/workflow/state/task/llm';

definePageMeta({
  layout: 'fluid',
  pageScrollingDisabledOnMdUp: true,
});

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const state = reactive({
  dataset: null,
  isFormExpanded: true,
  outputLoadingMap: {},
  outputResultMap: {},
  error: null,
  evaluationForm: {
    llmResource: null,
    systemPrompt: '',
    userPrompt: '',
  },
});

const fetchDataset = async () => {
  const { data, error } = await server.dataset.get({
    datasetId: route.params.id,
  }, {
    lazy: false,
    onResponse: ({ _data }) => {
      breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
      breadcrumbStore.setLoading(false);
    },
  });
  if (error.value) {
    state.error = error.value;
    return;
  };
  state.dataset = data.value;
};

const interpolatePromptTemplate = (template, item) => {
  if (!template) return '';
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const value = item?.datasetItemData?.[key];
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
};

const startLlmExecution = async ({ llmResource, systemPrompt, userPrompt }) => {
  const signal = createSignal();
  const payload = new LlmPayload({
    llm: LlmActionExecutionPayloadFactory.create({
      ...llmResource,
      llmId: llmResource?.id,
      llmType: llmResource?.type,
      systemPrompt: systemPrompt || '',
      messages: [
        new MessageActionExecutionPayload({
          role: ChatConstant.MessageRole.USER,
          content: [
            new TextContentBlockActionExecutionPayload({
              contentBlockType: ContentBlockConstant.Type.TEXT.value,
              text: userPrompt || $t('__instructionWorkflowActionCustomPrompt'),
            }),
          ],
        }),
      ],
    }),
    streamingConfig: null,
  });

  const { data, error } = await server.actionExecution.start({ actionPayload: payload }, { signal });
  if (signal.aborted) return null;
  if (error.value) {
    snackbarStore.setActionFailure('__actionEvaluate');
    throw new Error(error.value);
  }
  return await pollLlmExecution(data.value.executionArn);
};

const pollLlmExecution = async (executionArn) => {
  if (!executionArn) return null;

  const { data, error } = await server.actionExecution.get({ executionArn });
  if (error.value) {
    snackbarStore.setActionFailure('__actionEvaluate');
    throw new Error(error.value);
  }

  const result = data.value;
  if (result.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return await pollLlmExecution(executionArn);
  }

  return result;
};

const handleEvaluate = async (item) => {
  if (!item?.id) return;
  state.outputLoadingMap[item.id] = true;
  const userPrompt = interpolatePromptTemplate(state.evaluationForm.userPrompt, item);
  try {
    const result = await startLlmExecution({
      llmResource: state.evaluationForm.llmResource,
      systemPrompt: state.evaluationForm.systemPrompt,
      userPrompt,
    });
    if (result?.actionOutput && result.status === StatusConstant.Runtime.SUCCEEDED.value) {
      const outputMessage = result?.actionOutput.message || '';
      state.outputResultMap[item.id] = outputMessage;
    }
  } finally {
    delete state.outputLoadingMap[item.id];
  }
};

const handleColumnsAdd = async () => {
  await fetchDataset();
};

const handleColumnsDelete = async () => {
  await fetchDataset();
};

const handleColumnsEdit = async () => {
  await fetchDataset();
};

const handleDatasetItemFromStorageReplace = async () => {
  await fetchDataset();
};

const handleDatasetItemsGenerate = async () => {
  await fetchDataset();
};

const handleGenerationConfigSave = async () => {
  await fetchDataset();
};

fetchDataset();
</script>
<template>
  <div class="h-100vh">
    <template v-if="state.dataset">
      <div class="evaluate-page">
        <ResourceInfoTitle :title="state.dataset.name">
          <template #prepend>
            <AppAddToFavoritesButton
              :item="state.dataset"
              :type="state.dataset.resourceType"
              persistent
            />
            <ResourceDatasetInfoMenu />
          </template>
        </ResourceInfoTitle>
        <v-row>
          <v-col
            :cols="12"
            :md="4"
            class="evaluate-form w-100"
            :class="{ 'evaluate-form--collapsed': !state.isFormExpanded }"
          >
            <div class="scroll pb-4">
              <ResourceDatasetEvaluationForm
                v-model:form-data="state.evaluationForm"
                v-model:expanded="state.isFormExpanded"
                :dataset="state.dataset"
              />
            </div>
          </v-col>
          <v-col
            :cols="12"
            :md="state.isFormExpanded ? 8 : 12"
            class="datasetItem-list position-relative d-flex flex-row pl-md-1"
          >
            <AppExpandToggleButton
              v-if="!state.isFormExpanded"
              v-model:expanded="state.isFormExpanded"
              class="mr-4"
            />
            <div class="scroll">
              <v-row>
                <v-col :cols="12">
                  <ResourceDatasetItemList
                    :dataset="state.dataset"
                    :execution-output-map="state.outputResultMap"
                    :loading-map="state.outputLoadingMap"
                    :on-evaluate="handleEvaluate"
                    :on-columns-delete="handleColumnsDelete"
                    :on-columns-add="handleColumnsAdd"
                    :on-columns-edit="handleColumnsEdit"
                    :on-dataset-item-from-storage-replace="handleDatasetItemFromStorageReplace"
                    :on-dataset-items-generate="handleDatasetItemsGenerate"
                    :on-generation-config-save="handleGenerationConfigSave"
                  />
                </v-col>
              </v-row>
            </div>
          </v-col>
        </v-row>
      </div>
    </template>
    <template v-else-if="state.error">
      <ResourceErrorCard
        :label="$t('__fieldDataset')"
        :status-code="state.error.data.status"
      />
    </template>
    <template v-else>
      <v-sheet
        color="transparent"
        width="100%"
        height="100vh"
        class="d-flex justify-center align-center"
      >
        <AppProgressDots />
      </v-sheet>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.evaluate-form {
  min-width: 300px;
  overflow: hidden;
  min-height: 0;
  transition:
    flex 0.25s ease,
    max-width 0.25s ease,
    min-width 0.25s ease,
    padding 0.25s ease;
  &--collapsed {
    flex: 0 0 0%;
    max-width: 0%;
    min-width: 0;
    padding: 0;
    width: 0;
  }
  .scroll {
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

.datasetItem-list {
  transition: padding 0.25s ease, flex 0.25s ease, max-width 0.25s ease;
  .scroll {
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
</style>

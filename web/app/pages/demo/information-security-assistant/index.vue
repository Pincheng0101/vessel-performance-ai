<script setup>
import { ChatConstant, IconConstant, StatusConstant } from '~/constants';
import { TextContentBlock } from '~/models/server/contentBlock';
import { WorkflowExecution } from '~/models/server/workflowExecution';
import { ExecutionDataStreamingResponse, ExecutionEndStreamingResponse, ExecutionErrorStreamingResponse, ExecutionStreamingRequest } from '~/models/websocket/execution';
import { GetExecutionResponse } from '~/models/websocket/execution';
import { LfeWebSocketClient } from '~/services/websocket';

/**
 * @import { ChatRoomMessage } from '~/models/ui/chatRoom'
 */

definePageMeta({
  layout: 'chat',
  alias: [
    // Support legacy URL
    '/demo/chiayi-tax',
  ],
});

const PAGE_TITLE = '資安知識問答助手';

const { awsAccountEnv, serverWsApiUrl } = useRuntimeConfig().public;
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const dayjs = useDayjs();
const route = useRoute();
const server = useServer();
const snackbarStore = useSnackbarStore();

useSeoMeta({
  title: PAGE_TITLE,
});

// Support legacy URL
breadcrumbStore.setBreadcrumb('chiayi-tax', PAGE_TITLE);
breadcrumbStore.setBreadcrumb('information-security-assistant', PAGE_TITLE);

// Redirect legacy URL to new URL
if (route.path === '/demo/chiayi-tax') {
  navigateTo('/demo/information-security-assistant#', { replace: true });
}

const workflows = computed(() => {
  switch (awsAccountEnv) {
    case 'platform':
      return [
        {
          title: '基礎 RAG 模式 (Haiku)',
          value: 'workflow-afd22834be001d1e',
          subtitle: '使用基礎 RAG + 無 Agentic Workflow + Claude 3.5 Haiku 大語言模型',
          icon: 'mdi-lightning-bolt',
          isDefault: false,
        },
        {
          title: '基礎 RAG 模式 (Llama)',
          value: 'workflow-cd5a71fee821cc4f',
          subtitle: '使用基礎 RAG + 無 Agentic Workflow + Llama 70B 大語言模型',
          icon: 'mdi-lightning-bolt',
          isDefault: false,
        },
        {
          title: '進階 RAG 模式 (Sonnet)',
          value: 'workflow-28badc9db0814a2d',
          subtitle: '使用進階 RAG + Agentic Workflow + Claude 3.5 Sonnet V2 大語言模型',
          icon: 'mdi-thought-bubble',
          isDefault: true,
        },
        {
          title: '進階 RAG 模式 (Sonnet) + 用戶身份控管',
          value: 'workflow-343ac2f9f6873267',
          subtitle: '使用進階 RAG + Agentic Workflow + Claude 3.5 Sonnet V2 大語言模型',
          icon: 'mdi-thought-bubble',
          isDefault: false,
        },
      ];
    default:
      return [];
  }
});

const selectedWorkflow = computed(() => workflows.value.find(item => item.value === state.workflowId));

const state = reactive({
  workflowId: workflows.value.find(item => item.isDefault)?.value,
  /**
   * @type {WorkflowExecution}
   */
  workflowExecution: null,
  /**
   * @type {LfeWebSocketClient}
   */
  wsClient: null,
  /**
   * @type {ChatRoomMessage[]}
   */
  messages: [],
  currentMessageId: null,
  isSending: false,
});

const sendMessage = async ({ contentBlocks, pendingMessageId }) => {
  state.currentMessageId = pendingMessageId;
  const firstTextBlock = contentBlocks.find(item => typeof item?.text === 'string');

  const executionPayload = {
    input: {
      question: firstTextBlock?.text,
    },
  };

  await startWorkflowExecution(executionPayload);

  state.wsClient.getExecution(new ExecutionStreamingRequest({
    executionArn: state.workflowExecution.executionArn,
  }));

  return false;
};

const startWorkflowExecution = async (executionPayload) => {
  // Create a new workflow execution and set the status to pending
  state.workflowExecution = new WorkflowExecution({
    workflowId: state.workflowId,
    status: StatusConstant.Runtime.RUNNING.value,
  });

  let executionData;

  if (executionPayload.useExternalMemoryInput) {
    const { data: uploadData, error: uploadError } = await server.externalMemory.upload();
    if (uploadError.value) {
      return;
    }

    try {
      await server.externalMemory.uploadToS3({
        presignedUrl: uploadData.value.presignedUrl.url,
        payload: executionPayload.input,
      });
    } catch (error) {
      console.error('S3 upload failed:', error);
      return;
    }

    const { data, error } = await server.workflowExecution.startWithExternalMemory({
      ...executionPayload,
      workflowId: state.workflowId,
      externalMemoryId: uploadData.value.externalMemoryId,
    });
    if (error.value) {
      Object.assign(state.workflowExecution, {
        status: StatusConstant.Runtime.FAILED.value,
        error: error.value.data.getMessage(),
      });
      return;
    }
    executionData = data.value;
  } else {
    const { data, error } = await server.workflowExecution.start({
      ...executionPayload,
      workflowId: state.workflowId,
    });
    if (error.value) {
      Object.assign(state.workflowExecution, {
        status: StatusConstant.Runtime.FAILED.value,
        error: error.value.data.getMessage(),
      });
      throw new Error(error.value);
    }
    executionData = data.value;
  }

  Object.assign(state.workflowExecution, {
    executionArn: executionData.executionArn,
    displayName: executionPayload.displayName,
    startTs: dayjs().unix(),
  });
};

const handleMessage = async (message) => {
  const findCurrentById = ({ id }) => id === state.currentMessageId;
  try {
    if (message instanceof ExecutionDataStreamingResponse) {
      state.messages
        .find(findCurrentById)
        .pushThinkingStep(new TextContentBlock({ text: message.name }));
      return;
    }
    if (message instanceof ExecutionEndStreamingResponse) {
      const messageResponse = new GetExecutionResponse(message.response);
      if (messageResponse.responseUrl) {
        const { data, error } = await server.workflowExecution.get({ executionArn: state.workflowExecution.executionArn });
        if (error.value) {
          throw new Error(error.value.data.getMessage());
        }
        state.messages
          .find(findCurrentById)
          .pushContentBlock(new TextContentBlock({ text: data.value.output.GenerateAnswerResult.answer }))
          .setStatus(ChatConstant.MessageStatus.COMPLETED);

        state.isSending = false;
        return;
      }
      if (messageResponse.execution.cause) {
        const cause = jsonUtils.safeParse(messageResponse.execution.cause);
        if (cause) {
          throw new Error(cause.errorMessage);
        }
        throw new Error(messageResponse.execution.error);
      }
      state.messages
        .find(findCurrentById)
        .pushContentBlock(new TextContentBlock({ text: messageResponse.execution.output.GenerateAnswerResult.answer }))
        .setStatus(ChatConstant.MessageStatus.COMPLETED);

      state.isSending = false;
      return;
    }
    if (message instanceof ExecutionErrorStreamingResponse) {
      throw new Error(message.error.message);
    }
    if (message.error) {
      throw new Error(message.error);
    }
  } catch (error) {
    snackbarStore.setFailure(error.message);
    snackbarStore.report(error.message);

    state.messages
      .find(findCurrentById)
      .pushContentBlock(new TextContentBlock({ text: error.message }))
      .setStatus(ChatConstant.MessageStatus.FAILED);

    state.isSending = false;
  }
};

const handleCancel = () => {
  if (state.wsClient) {
    state.wsClient.close();
  }
  connect();
};

const connect = async () => {
  try {
    state.wsClient = new LfeWebSocketClient({
      url: serverWsApiUrl,
      token: authStore.accessToken,
      onMessage: handleMessage,
    });
    await state.wsClient.connect();
  } catch (error) {
    console.error('WebSocket connection failed:', error);
  }
};

onMounted(() => {
  connect();
});

onBeforeUnmount(() => {
  if (state.wsClient) {
    state.wsClient.close();
  }
});
</script>

<template>
  <ChatRoom
    v-model:messages="state.messages"
    v-model:sending="state.isSending"
    :assistant-icon="IconConstant.Base.AGENT"
    :on-cancel="handleCancel"
    :on-send="sendMessage"
    :show-read-aloud-button="false"
    :title="PAGE_TITLE"
    :description="`- 知識庫限定 ISMS／PIMS 文件。\n- 基礎模式為對照組，請使用進階模式進行測試。\n- 正式版可依需求客製化介面，並調整回應速度。`"
    input-placeholder="提出 ISMS／PIMS 文件相關的資安問題"
  >
    <template #input-bottom>
      <v-menu>
        <template #activator="{ props: p, isActive }">
          <template v-if="selectedWorkflow">
            <v-chip
              v-bind="p"
              size="small"
              color="primaryLight"
              variant="outlined"
              class="bg-background mb-2"
            >
              <div class="d-flex ga-1 align-center">
                <v-icon :icon="selectedWorkflow.icon" />
                {{ selectedWorkflow.title }}
                <v-icon :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
              </div>
            </v-chip>
          </template>
        </template>
        <v-card
          :elevation="1"
          rounded="lg"
        >
          <v-list
            density="compact"
            class="py-0"
          >
            <template
              v-for="item in workflows"
              :key="item.title"
            >
              <v-list-item
                :active="state.workflowId === item.value"
                :title="item.title"
                :subtitle="item.subtitle"
                :prepend-icon="item.icon"
                class="text-body-2"
                @click="() => {
                  state.workflowId = item.value;
                }"
              />
            </template>
          </v-list>
        </v-card>
      </v-menu>
    </template>
    <template #input-footer>
      此介面為測試版，不支援連續提問，每次輸入皆為獨立問答。
    </template>
  </ChatRoom>
</template>

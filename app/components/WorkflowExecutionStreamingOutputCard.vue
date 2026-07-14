<script setup>
import { IconConstant, StreamingConstant } from '~/constants';
import { ExecutionStreamingRequest } from '~/models/websocket/execution';
import { LfeWebSocketClient } from '~/services/websocket';

const props = defineProps({
  executionArn: {
    type: String,
    required: true,
  },
  hasStreamingAction: {
    type: Boolean,
    required: true,
  },
});

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const { serverWsApiUrl } = useRuntimeConfig().public;
const { isWebSocketApiDisabled } = useFeature();

const state = reactive({
  /**
   * @type {LfeWebSocketClient}
   */
  wsClient: null,
  isConnecting: false,
  isStreaming: false,
  messages: [],
});

const handleMessage = (message) => {
  state.messages.push(message);

  if (message.responseType === StreamingConstant.ResponseType.START.value) {
    state.isStreaming = true;
  }
  if (message.responseType === StreamingConstant.ResponseType.END.value || message.responseType === StreamingConstant.ResponseType.ERROR.value) {
    state.isStreaming = false;
  }
};

const connect = async () => {
  if (state.isConnecting) return;
  state.isConnecting = true;

  try {
    state.wsClient = new LfeWebSocketClient({
      url: serverWsApiUrl,
      token: authStore.accessToken,
      onMessage: handleMessage,
      onError: (error) => {
        console.error(error);
        snackbarStore.setFailure($t('__messageWebSocketConnectionError'));
      },
    });
    await state.wsClient.connect();
    state.wsClient.getExecution(new ExecutionStreamingRequest({
      executionArn: props.executionArn,
    }));
  } catch (error) {
    console.error('WebSocket connection failed:', error);
  } finally {
    state.isConnecting = false;
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
  <AppDetailsCard
    :title="$t('__titleStreamingOutput')"
    card-text-class="pa-0"
  >
    <template #body>
      <template v-if="isWebSocketApiDisabled">
        <AppNotEnabledCard
          :i18n-item="$t('__titleStreamingOutput')"
          :icon="IconConstant.Base.STREAMING"
          min-height="400"
        />
      </template>
      <template v-else>
        <template v-if="props.hasStreamingAction">
          <WorkflowExecutionStreamingOutputList
            :messages="state.messages"
            :is-loading="state.isConnecting"
            :show-progress="state.isStreaming"
            hide-details
          />
        </template>
        <template v-else>
          <AppInfoCard
            :title="$t('__titleNoStreamingActions')"
            :instruction="$t('__instructionNoStreamingActions')"
            :icon="IconConstant.Base.STREAMING"
            min-height="400"
          />
        </template>
      </template>
    </template>
  </AppDetailsCard>
</template>

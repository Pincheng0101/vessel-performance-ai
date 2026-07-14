<script setup>
import { ExecutionStreamingRequest } from '~/models/websocket/execution';
import { LfeWebSocketClient } from '~/services/websocket';

definePageMeta({
  layout: 'fluid',
});

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const { serverWsApiUrl } = useRuntimeConfig().public;

const state = reactive({
  /**
   * @type {LfeWebSocketClient}
   */
  wsClient: null,
  url: serverWsApiUrl,
  executionArn: '',
  isConnected: false,
  isConnecting: false,
  messages: [],
});

const handleMessage = (message) => {
  state.messages.push(message);
};

const connect = async () => {
  if (state.isConnected || state.isConnecting) return;
  state.wsClient = new LfeWebSocketClient({
    url: state.url,
    token: authStore.accessToken,
    onOpen: () => {
      state.isConnected = true;
      state.isConnecting = false;
      snackbarStore.setActionSuccess('__actionConnect');
    },
    onClose: () => {
      state.isConnected = false;
      state.isConnecting = false;
    },
    onError: () => {
      state.isConnected = false;
      state.isConnecting = false;
      snackbarStore.setFailure($t('__messageWebSocketConnectionError'));
    },
    onMessage: (message) => {
      state.isConnecting = false;
      handleMessage(message);
    },
  });

  try {
    state.isConnecting = true;
    await state.wsClient.connect();
  } catch (error) {
    console.error(error);
  }
};

const disconnect = () => {
  state.wsClient.close();
  state.executionArn = '';
  clearMessages();
};

const send = () => {
  state.wsClient.getExecution(new ExecutionStreamingRequest({
    executionArn: state.executionArn,
  }));
};

const clearMessages = () => {
  state.messages = [];
};

onBeforeUnmount(() => {
  if (state.wsClient) {
    state.wsClient.close();
  }
});
</script>

<template>
  <ResourceInfoTitle
    title="LFE WebSocket Client"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldUrl')"
            required
          >
            <AppTextField
              :id="id"
              v-model="state.url"
              readonly
              variant="outlined"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            >
              <template #append>
                <template v-if="state.isConnected">
                  <AppButton
                    text="Disconnect"
                    variant="flat"
                    color="error"
                    @click="disconnect"
                  />
                </template>
                <template v-else>
                  <AppButton
                    text="Connect"
                    variant="flat"
                    color="primary"
                    :loading="state.isConnecting"
                    @click="connect"
                  />
                </template>
              </template>
            </AppTextField>
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldExecutionArn')"
            required
          >
            <AppTextField
              :id="id"
              v-model="state.executionArn"
              :disabled="!state.isConnected"
              variant="outlined"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            >
              <template #append>
                <AppButton
                  text="Send"
                  variant="flat"
                  color="primary"
                  @click="send"
                />
              </template>
            </AppTextField>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <div class="d-flex justify-space-between">
            <AppInputGroup label="Messages">
              <template v-if="state.messages.length > 0">
                <div
                  v-for="(msg, i) in state.messages"
                  :key="i"
                  class="py-2"
                >
                  <AppJsonEditor
                    :model-value="JSON.stringify(msg)"
                    readonly
                    hide-details
                  />
                </div>
              </template>
            </AppInputGroup>
            <AppIconButton
              icon="mdi-trash-can"
              variant="text"
              :tooltip="$t('__actionClearMessages')"
              :disabled="state.messages.length === 0"
              @click="clearMessages"
            />
          </div>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

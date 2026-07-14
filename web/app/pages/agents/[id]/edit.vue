<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';
import { AgentUserPreferences } from '~/models/ui/agent';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

definePageMeta({
  layout: 'fluid', // For better visual experience
});

const route = useRoute();
const server = useServer();
const authStore = useAuthStore();
const { openInNewTab } = useNavigation();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { t } = useI18n();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
  hasPermission: null,
  refreshChatRoom: 0,
});

state.hasPermission = await hasWritePermission(ResourceConstant.Type.AGENT.value);
breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.agent.get({
  agentId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const { data: preferenceData } = await server.uiData.get({
  key: AgentUserPreferences.getUiDataKey(route.params.id, authStore.parsedToken.sub),
}, {
  lazy: false,
});
const preferredStorageId = preferenceData.value?.value?.storageId ?? null;
const preferredLlmId = preferenceData.value?.value?.llmId ?? null;

const updateResource = async (resource, syncCreditConfig) => {
  const { error } = await server.agent.update({
    ...resource,
    agentPrompt: strUtils.isEmpty(resource.agentPrompt) ? null : resource.agentPrompt,
  });
  if (error.value) {
    state.error = error.value.data;
    return;
  }

  const isCreditConfigSaved = await syncCreditConfig(resource.agentId);
  const { data: refreshed } = await server.agent.get({ agentId: route.params.id }, { lazy: false });
  if (refreshed.value) data.value = refreshed.value;
  if (isCreditConfigSaved === false) {
    snackbarStore.setFailure(t('__messageCreditConfigSaveFailed'));
  } else {
    snackbarStore.setActionSuccess('__actionUpdate');
  }
  state.refreshChatRoom += 1;
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldAgent')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <AppSplitPane storage-key="agent-edit-pane-ratio">
      <template #left>
        <ResourceAgentForm
          :resource="data"
          :not-found-resource="state.error.notFoundResource"
          :hidden-fields="['knowledgeDomain']"
          :on-submit="updateResource"
          :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, data.id))"
        />
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
              :storage-id="preferredStorageId"
              :llm-id="preferredLlmId"
              :viewport-height-offset="60 + 24 + 24"
              :has-messages="false"
              background-color="backgroundScale2"
            />
          </v-card-text>
        </v-card>
      </template>
    </AppSplitPane>
  </template>
</template>

<style lang="scss" scoped>
.chat-room-container {
  position: sticky;
  top: calc(64px + 24px); // Header + padding
  max-height: calc(100dvh - 64px - 24px - 24px - 24px); // 100dvh - app header - padding top - padding bottom - footer
}
</style>

<script setup>
import { IconConstant, ResourceConstant } from '~/constants';
import { StartAgent } from '~/models/server/agent';
import { UiData } from '~/models/server/uiData';
import { AgentMetadata } from '~/models/ui/agent';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const authStore = useAuthStore();
const { openInNewTab } = useNavigation();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { isFirstPartyEnv } = useRuntimeConfig().public;
const { isAdminChatSessionViewDisabled } = useFeature();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.agent.get({
  agentId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const { data: metadataData } = await server.uiData.get({
  key: AgentMetadata.getUiDataKey(route.params.id),
});

const creditConfig = ref(null);
if (isFirstPartyEnv && authStore.parsedToken.isAdmin) {
  const { data: creditConfigData } = await server.agentCreditConfig.adminGet({
    agentId: route.params.id,
  }, { lazy: false });
  creditConfig.value = creditConfigData.value;
}

// Credit usage is first-party only, and visible to admins or when explicitly enabled
const showCreditTab = computed(() => isFirstPartyEnv && (data.value?.enableCredit || authStore.parsedToken.isAdmin));

// Admin cross-user chat session viewing is gated by a backend feature flag (off by default)
const showAdminChatSessionsTab = computed(() => authStore.parsedToken.isAdmin && !isAdminChatSessionViewDisabled.value);

const handleDelete = async ({ agentId }) => {
  const { error } = await server.agent.destroy({ agentId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.AGENT.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.agent.duplicate({
    agentId: route.params.id,
    newAgentName: resource.name,
  });
  if (error.value) {
    return;
  }
  if (metadataData.value?.value) {
    const { error: uiDataError } = await server.uiData.set(new UiData({
      key: AgentMetadata.getUiDataKey(data.value.id),
      value: new AgentMetadata(metadataData.value.value),
    }));
    if (uiDataError.value) {
      return;
    }
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`${data.value.id}`);
};

const clientCodeFormData = computed(() => StartAgent.toRequestPayload(new StartAgent({
  agentId: route.params.id,
})));

const editPath = computed(() => {
  const metadata = metadataData.value ? new AgentMetadata(metadataData.value.value) : null;
  return metadata?.isCreatedFromAgentBuilder
    ? `/quick-start/agents/${route.params.id}/edit`
    : `${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, route.params.id)}/edit`;
});
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
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
          ...(showCreditTab ? [{ title: $t('__titleCreditUsage'), value: 'creditUsage' }] : []),
          ...(showAdminChatSessionsTab ? [{ title: $t('__titleAdminChatSessions'), value: 'adminChatSessions' }] : []),
        ]"
        :preload-tabs="showCreditTab ? ['creditUsage'] : []"
      >
        <template #general>
          <ResourceDetailsCard
            :item="data"
            :module="ResourceConstant.Type.AGENT.module"
            :edit-path="editPath"
            :item-label="$t('__fieldAgent')"
            :allow-delete-recursively="ResourceConstant.Type.AGENT.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.AGENT.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #before-delete-actions>
              <AppIconButton
                :aria-label="$t('__actionViewUsageAnalysis')"
                :icon="IconConstant.Base.USAGE"
                variant="text"
                :tooltip="$t('__actionViewUsageAnalysis')"
                :on-click="() => navigateTo(`/usage/agents/${data.id}`)"
              />
              <AgentClientCodeButton :form-data="clientCodeFormData" />
            </template>
            <template #append-display-fields>
              <AppDetailsCardExpansionPanels>
                <AppDetailsCardExpansionPanel
                  :title="$t('__titleBuiltInTools')"
                  value="builtInTools"
                >
                  <AppDisplayFieldGroup
                    :items="data.builtInToolsDisplayFields"
                    hide-label
                  />
                </AppDetailsCardExpansionPanel>
                <AppDetailsCardExpansionPanel
                  :title="$t('__titleCustomTools')"
                  value="tools"
                >
                  <template v-if="data.toolsDisplayFields.length > 0">
                    <AppDisplayFieldGroup :items="data.toolsDisplayFields" />
                  </template>
                  <template v-else>
                    <AppInfoCard
                      :title="$t('__titleNoCustomTools')"
                      :instruction="$t('__instructionNoCustomTools')"
                      icon="mdi-toolbox-outline"
                      min-height="180"
                    />
                  </template>
                </AppDetailsCardExpansionPanel>
                <AppDetailsCardExpansionPanel
                  :title="$t('__titleUiSettings')"
                  value="uiConfig"
                >
                  <AppDisplayFieldGroup
                    :items="[
                      { title: $t('__fieldAgentUiConfigAvatar'), value: data.uiConfig.avatarImage, isImage: true, imageOptions: { variant: 'avatar' } },
                      { title: $t('__fieldTitle'), value: data.uiConfig.title },
                      { title: $t('__fieldDescription'), value: data.uiConfig.description, isMarkdown: true, markdownViewerOptions: { enableAnchors: false } },
                      { title: $t('__fieldAgentUiConfigInputPlaceholder'), value: data.uiConfig.inputPlaceholder },
                      { title: $t('__fieldAgentUiConfigStarterPrompts'), value: data.uiConfig.starterPrompts?.split('\n').map(s => s.trim()).filter(Boolean), isChip: true },
                      { title: $t('__fieldAgentUiConfigShowStorageButton'), value: data.uiConfig.showStorageButton ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: { color: data.uiConfig.showStorageButton ? 'success' : null } },
                    ]"
                  />
                </AppDetailsCardExpansionPanel>
                <AppDetailsCardExpansionPanel
                  v-if="isFirstPartyEnv"
                  :title="$t('__titleCreditSettings')"
                  value="creditSettings"
                >
                  <AppDisplayFieldGroup
                    :items="[
                      { title: $t('__fieldAgentEnableCredit'), value: data.enableCredit ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: { color: data.enableCredit ? 'success' : null } },
                    ]"
                  />
                  <AppDisplayFieldGroup
                    v-if="authStore.parsedToken.isAdmin"
                    :items="[
                      { title: $t('__fieldCreditConfigEnabled'), value: creditConfig ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: { color: creditConfig ? 'success' : null } },
                      ...(creditConfig ? [
                        { title: $t('__fieldCreditTierThreshold'), value: creditConfig.tierThreshold, isNumber: true },
                        { title: $t('__fieldCreditQuota'), value: creditConfig.quota === null ? $t('__labelCreditUnlimited') : creditConfig.quota, isNumber: creditConfig.quota !== null },
                      ] : []),
                    ]"
                  />
                </AppDetailsCardExpansionPanel>
              </AppDetailsCardExpansionPanels>
            </template>
          </ResourceDetailsCard>
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.AGENT.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.AGENT.value"
          />
        </template>
        <template #creditUsage>
          <AgentCreditUsageCard
            :agent-id="data.id"
            :enable-credit="data.enableCredit"
          />
        </template>
        <template #adminChatSessions>
          <AgentAdminChatSessionsCard :agent="data" />
        </template>
        <template #append>
          <div class="d-flex align-center justify-end ga-2">
            <AppButton
              :text="$t('__actionGoToChat')"
              append-icon="mdi-open-in-new"
              class="primary-gradient"
              @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, data.id)}/chat`)"
            />
          </div>
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldAgent')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>

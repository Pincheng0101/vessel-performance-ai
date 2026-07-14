<script setup>
import { InfiniteScrollConstant } from '~/constants';

const route = useRoute();
const agentChatStore = useAgentChatStore();
const authStore = useAuthStore();

const { chatSessions, pinnedSessions, pinnedSessionIds } = storeToRefs(agentChatStore);

const state = reactive({
  scrollCount: 0,
  isPinnedCollapsed: false,
});

const pinnedCollapsedStorageKey = computed(() => {
  const agentId = route.params.id;
  const userId = authStore.parsedToken?.sub;
  if (!agentId || !userId) return null;
  return `chat-session-pins-collapsed-${agentId}-${userId}`;
});

watch(pinnedCollapsedStorageKey, (key) => {
  if (!key) {
    state.isPinnedCollapsed = false;
    return;
  }
  state.isPinnedCollapsed = localStorage.getItem(key) === 'true';
}, { immediate: true });

const togglePinnedCollapsed = () => {
  state.isPinnedCollapsed = !state.isPinnedCollapsed;
  if (pinnedCollapsedStorageKey.value) {
    localStorage.setItem(pinnedCollapsedStorageKey.value, String(state.isPinnedCollapsed));
  }
};

const unpinnedSessions = computed(() => {
  const pinnedIdSet = new Set(pinnedSessionIds.value);
  return chatSessions.value.filter(s => !pinnedIdSet.has(s.sessionId));
});

const loadChatSessions = async ({ done = () => {} } = {}) => {
  if (!agentChatStore.agent?.id) {
    done(InfiniteScrollConstant.LoadStatus.EMPTY);
  }
  await agentChatStore.loadChatSessions({
    agentId: agentChatStore.agent?.id,
    done,
  });
};

const handleDelete = async (item) => {
  await agentChatStore.deleteChatSession({
    agentId: agentChatStore.agent?.id,
    sessionId: item.sessionId,
  });
  if (route.params.sessionId === item.sessionId) {
    navigateTo(`/agents/${route.params.id}/chat`);
  }
};

const handleScroll = useThrottleFn(() => {
  state.scrollCount += 1;
}, 1000);

watch(() => route.params.id, () => {
  agentChatStore.reset();
}, { immediate: true });

onBeforeUnmount(() => {
  agentChatStore.reset();
});
</script>

<template>
  <LayoutHeader>
    <template #navigation-drawer>
      <div class="px-3 py-5">
        <AppButton
          :text="$t('__actionNewChat')"
          :to="route.params.id ? `/agents/${route.params.id}/chat` : undefined"
          class="primary-gradient"
          prepend-icon="mdi-square-edit-outline"
          width="100%"
          @click="() => {
            if (!route.params.sessionId) {
              agentChatStore.restartChat();
            }
            agentChatStore.lockNavigation();
          }"
        />
      </div>
      <v-list
        :rounded="false"
        class="py-0"
      >
        <!-- 100dvh - padding - logo height - button height - padding - avatar bar -->
        <v-infinite-scroll
          height="calc(100dvh - 24px - 24px - 36px - 40px - 57px)"
          @load="loadChatSessions"
          @scroll="handleScroll"
        >
          <template v-if="pinnedSessions.length">
            <v-sheet
              color="background"
              class="text-caption font-weight-bold py-2 pl-4 pr-2 position-sticky top-0 z-index-1 d-flex align-center cursor-pointer user-select-none"
              role="button"
              tabindex="0"
              :aria-expanded="!state.isPinnedCollapsed"
              @click="togglePinnedCollapsed"
              @keydown.enter.prevent="togglePinnedCollapsed"
              @keydown.space.prevent="togglePinnedCollapsed"
            >
              <span>{{ $t('__titlePinnedChats') }}</span>
              <v-icon
                :icon="state.isPinnedCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
                size="small"
              />
            </v-sheet>
            <div
              class="pinned-collapse"
              :class="{ 'pinned-collapse--collapsed': state.isPinnedCollapsed }"
            >
              <div class="pinned-collapse__inner">
                <ChatSessionListItem
                  v-for="item in pinnedSessions"
                  :key="`pinned-${item.sessionId}`"
                  :item="item"
                  is-pinned
                  :close="state.scrollCount"
                  :on-delete="handleDelete"
                />
              </div>
            </div>
          </template>
          <template
            v-for="(item, i) in unpinnedSessions"
            :key="item.sessionId"
          >
            <AppDateSeparator
              :index="i"
              :dates="unpinnedSessions.map(s => s.lastMessageTs)"
              class="pl-4 mt-4"
            />
            <ChatSessionListItem
              :item="item"
              :close="state.scrollCount"
              :on-delete="handleDelete"
            />
          </template>
          <template #loading>
            <AppProgressCircular
              :size="32"
              :width="2"
            />
          </template>
          <template #empty>
            <template v-if="!agentChatStore.isLoading && chatSessions.length === 0 && pinnedSessions.length === 0">
              <div class="d-flex flex-column align-center justify-center text-body-2 font-weight-bold ga-2">
                {{ $t('__instructionNoChatsFound') }}
              </div>
            </template>
          </template>
        </v-infinite-scroll>
      </v-list>
    </template>
  </LayoutHeader>
</template>

<style lang="scss" scoped>
.pinned-collapse {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.pinned-collapse--collapsed {
  grid-template-rows: 0fr;
}
.pinned-collapse__inner {
  overflow: hidden;
  min-height: 0;
}
</style>

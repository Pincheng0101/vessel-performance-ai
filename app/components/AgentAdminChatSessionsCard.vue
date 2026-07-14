<script setup>
import { InfiniteScrollConstant, ListConstant } from '~/constants';

const props = defineProps({
  agent: {
    type: Object,
    required: true,
  },
});

const server = useServer();

const state = reactive({
  selectedUser: null,
  users: [],
  isUsersLoading: false,
  sessions: [],
  nextToken: null,
  isLoading: false,
  selectedSession: null,
});

const selectedUsername = computed(() => state.selectedUser?.userName ?? null);

// Bumped whenever the selected user changes; an in-flight session-list load
// compares its captured id against the latest value and bails if it no
// longer matches, so a stale page cannot leak into another user's list.
let loadCounter = 0;

const loadUsers = async () => {
  state.isUsersLoading = true;
  const users = [];
  let nextToken = null;
  do {
    const { data, error } = await server.user.adminList({
      nextToken,
      // 200 is the backend max (BaseListRequest: le=200); use it to minimize round-trips.
      limit: 200,
    }, {
      lazy: false,
    });
    if (error.value) break;
    users.push(...data.value.data);
    nextToken = data.value.nextToken;
  } while (nextToken);
  state.users = users;
  state.isUsersLoading = false;
};

const resetSessions = () => {
  loadCounter += 1;
  state.sessions = [];
  state.nextToken = null;
  state.selectedSession = null;
  state.isLoading = false;
};

const loadSessions = async ({ done }) => {
  if (!selectedUsername.value) {
    return done(InfiniteScrollConstant.LoadStatus.EMPTY);
  }
  // Already loaded every page — stop here so v-infinite-scroll does not
  // re-fetch the first page (next_token=null) and append duplicates.
  if (state.nextToken === null && state.sessions.length > 0) {
    return done(InfiniteScrollConstant.LoadStatus.EMPTY);
  }
  const loadId = loadCounter;
  state.isLoading = true;
  const { data, error } = await server.chatSession.list({
    agentId: props.agent.id,
    username: selectedUsername.value,
    nextToken: state.nextToken,
    limit: ListConstant.DefaultParams.PER_PAGE,
  }, {
    lazy: false,
  });
  // Selected user switched mid-flight — discard this page so it cannot mix into
  // another user's session list or clobber its pagination state.
  if (loadId !== loadCounter) {
    return;
  }
  state.isLoading = false;
  if (error.value) {
    done(InfiniteScrollConstant.LoadStatus.ERROR);
    return;
  }
  state.sessions.push(...data.value.data);
  state.nextToken = data.value.nextToken;
  done(state.nextToken ? InfiniteScrollConstant.LoadStatus.OK : InfiniteScrollConstant.LoadStatus.EMPTY);
};

const selectSession = (session) => {
  state.selectedSession = session;
};

watch(selectedUsername, resetSessions);

onMounted(loadUsers);
</script>

<template>
  <v-card
    flat
    border
  >
    <v-card-text>
      <AppAutocomplete
        v-model="state.selectedUser"
        :items="state.users"
        :loading="state.isUsersLoading"
        :on-refresh="loadUsers"
        item-title="userName"
        item-value="userName"
        return-object
        clearable
        hide-details
        :label="$t('__fieldUser')"
      />
    </v-card-text>
    <v-divider />
    <template v-if="state.selectedUser">
      <v-row
        no-gutters
        class="admin-chat-sessions"
      >
        <v-col
          cols="12"
          md="4"
          class="session-list-col"
        >
          <v-infinite-scroll
            :key="selectedUsername"
            height="600"
            @load="loadSessions"
          >
            <v-list
              v-if="state.sessions.length"
              density="compact"
              class="session-list"
            >
              <v-list-item
                v-for="session in state.sessions"
                :key="session.sessionId"
                :active="state.selectedSession?.sessionId === session.sessionId"
                class="px-4"
                @click="selectSession(session)"
              >
                <v-list-item-title class="text-body-2">
                  {{ session.sessionName }}
                </v-list-item-title>
                <template v-if="session.lastMessageTs">
                  <v-list-item-subtitle class="text-caption">
                    <AppTimestamp
                      :value="session.lastMessageTs"
                      is-relative
                    />
                  </v-list-item-subtitle>
                </template>
              </v-list-item>
            </v-list>
            <template #loading>
              <AppProgressCircular
                :size="32"
                :width="2"
              />
            </template>
            <template #empty>
              <template v-if="!state.isLoading && state.sessions.length === 0">
                <div class="d-flex align-center justify-center text-medium-emphasis text-body-2 pa-6">
                  {{ $t('__messageAdminChatNoSessions') }}
                </div>
              </template>
            </template>
          </v-infinite-scroll>
        </v-col>
        <v-col
          cols="12"
          md="8"
          class="session-viewer-col"
        >
          <template v-if="state.selectedSession">
            <AgentChatRoomReadonly
              :agent="props.agent"
              :session-id="state.selectedSession.sessionId"
              :username="selectedUsername"
              :has-messages="!!state.selectedSession.lastMessageTs"
              fill-height
            />
          </template>
          <template v-else>
            <div class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2 pa-12">
              {{ $t('__instructionAdminSelectChatSession') }}
            </div>
          </template>
        </v-col>
      </v-row>
    </template>
    <template v-else>
      <v-sheet
        class="d-flex align-center justify-center text-medium-emphasis text-body-2 pa-12"
        color="transparent"
      >
        {{ $t('__instructionAdminSelectChatUser') }}
      </v-sheet>
    </template>
  </v-card>
</template>

<style lang="scss" scoped>
.session-list-col {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
/* v-infinite-scroll is a flex column; without this the list is a shrinkable
   flex item that collapses to the container height, so content never overflows
   and the loader keeps paging through every session. Keep its intrinsic height. */
.session-list {
  flex: 0 0 auto;
  /* Override the global `.v-list { background … !important }` (vuetify.scss) so
     the list shows the card background instead of the page background. */
  background-color: transparent !important;
}
.session-viewer-col {
  height: 600px;
}
</style>

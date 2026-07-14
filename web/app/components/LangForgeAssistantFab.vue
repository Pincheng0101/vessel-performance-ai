<script setup>
import { IconConstant } from '~/constants';

const route = useRoute();
const auth = useAuth();
const assistantStore = useAssistantStore();
const { isFirstPartyEnv } = useRuntimeConfig().public;

// Layouts that should never show the assistant (they are full-screen chats,
// execution views, or unauthenticated pages).
const EXCLUDED_LAYOUTS = ['chat', 'execute', 'centered'];
// Route prefixes that should never show the assistant (dev tooling, usage dashboards).
const EXCLUDED_PATH_PREFIXES = ['/playground', '/usage'];

const showAssistant = computed(() =>
  isFirstPartyEnv
  && auth.isSignedIn.value
  && !EXCLUDED_LAYOUTS.includes(route.meta.layout)
  && !EXCLUDED_PATH_PREFIXES.some(prefix => route.path.startsWith(prefix)),
);
</script>

<template>
  <template v-if="showAssistant">
    <template v-if="!assistantStore.isOpen">
      <AppFab
        v-model="assistantStore.isOpen"
        :icon="IconConstant.Base.ASSISTANT"
      />
    </template>
    <LangForgeAssistantChatPanel
      v-model="assistantStore.isOpen"
      :greeting-message="$t('__instructionLangForgeAssistantGreeting')"
    />
  </template>
</template>

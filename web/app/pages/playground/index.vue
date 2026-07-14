<script setup>
import { IconConstant } from '~/constants';

const items = [
  {
    title: 'Workflow Actions',
    path: '/playground/workflow-actions',
    icon: 'mdi-checkbox-marked-circle-auto-outline',
    description: 'Demonstrates workflow actions and the translated definition based on user input.',
  },
  {
    title: 'Agent Chat Room',
    path: '/playground/agent-chat-room',
    icon: 'mdi-robot',
    description: 'Demonstrates chatting with an agent and streaming responses in real time.',
  },
  {
    title: 'LangForge Assistant Chat Room',
    path: '/playground/langforge-assistant-chat-room',
    icon: 'mdi-face-agent',
    description: 'Demonstrates LangForge Assistant providing system information and tools through MCP.',
  },
  {
    title: 'Chat Room',
    path: '/playground/chat-room',
    icon: 'mdi-forum',
    description: 'Demonstrates a chat room with instant message display and testable chat UI behavior.',
  },
  {
    title: 'Prompt Rewriter',
    path: '/playground/prompt-rewriter',
    icon: 'mdi-auto-fix',
    description: 'Assist in rewriting prompts to make instructions clearer and more structured.',
  },
  {
    title: 'Key-Value Pair Table',
    path: '/playground/key-value-pair-table',
    icon: 'mdi-variable',
    description: 'Manages key-value pairs with a table interface.',
  },
  {
    title: 'Workflow ASL Validator',
    path: '/playground/workflow-asl-validator',
    icon: 'mdi-check-circle-outline',
    description: 'Validation of workflow ASL definitions.',
  },
  {
    title: 'ASL to Simulated Output',
    path: '/playground/asl-to-simulated-output',
    icon: 'mdi-transfer-right',
    description: 'Generates simulated output based on ASL.',
  },
  {
    title: 'JSON Schema Playground',
    path: '/playground/json-schema-playground',
    icon: 'mdi-code-braces-box',
    description: 'Builds and renders a JSON schema.',
  },
  {
    title: 'Markdown Viewer',
    path: '/playground/markdown-viewer',
    icon: 'mdi-table-of-contents',
    description: 'Renders markdown content and displays a table of contents.',
  },
  {
    title: 'JSON to Markdown',
    path: '/playground/json-to-markdown',
    icon: 'mdi-language-markdown',
    description: 'Converts JSON input into its Markdown representation.',
  },
  {
    title: 'Draggable',
    path: '/playground/draggable',
    icon: 'mdi-drag-variant',
    description: 'Enables element reordering through drag-and-drop.',
  },
  {
    title: 'Text to Color',
    path: '/playground/text-to-color',
    icon: 'mdi-format-color-fill',
    description: 'Generates a color based on text and seed.',
  },
  {
    title: 'Data Comparer',
    path: '/playground/data-comparer',
    icon: 'mdi-compare-horizontal',
    description: 'Compares data structures at specified intervals.',
  },
  {
    title: 'Date Separator',
    path: '/playground/date-separator',
    icon: 'mdi-calendar-range',
    description: 'Groups and labels dates by time intervals.',
  },
  {
    title: 'Data Reversible',
    path: '/playground/data-reversible',
    icon: 'mdi-arrow-u-left-top',
    description: 'Reverses data changes through undo and redo actions.',
  },
  {
    title: 'Countdown Timer',
    path: '/playground/countdown-timer',
    icon: 'mdi-timer-outline',
    description: 'Displays a countdown timer with customizable hours, minutes, and seconds.',
  },
  {
    title: 'LFE WebSocket Client',
    path: '/playground/lfe-websocket-client',
    icon: 'mdi-transit-connection-variant',
    description: 'Tests LFE WebSocket connections and messages.',
  },
  {
    title: 'Stepper',
    path: '/playground/stepper',
    icon: 'mdi-step-forward',
    description: 'Demonstrates a configurable stepper component that supports per-step content, validation and error handling.',
  },
  {
    title: 'Rollbar Tester',
    path: '/playground/rollbar-tester',
    icon: 'mdi-bug-outline',
    description: 'Triggers a test error for Rollbar monitoring.',
  },
  {
    title: 'Charts',
    path: '/playground/charts',
    icon: 'mdi-chart-bar',
    description: 'Displays basic charts with token usage data.',
  },
];

const state = reactive({
  query: '',
});

const filteredItems = computed(() => {
  const q = String(state.query || '').toLowerCase();
  return items.filter(i => i.title.toLowerCase().includes(q));
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex align-center">
      <v-icon
        :icon="IconConstant.Base.PLAYGROUND"
        class="mr-2"
        color="primary"
        size="small"
      />
      <span class="text-h6">
        {{ $t('__titlePlayground') }}
      </span>
    </div>
    <AppTextField
      v-model="state.query"
      :label="$t('__actionSearch')"
      prepend-inner-icon="mdi-magnify"
      hide-details
      clearable
    />
    <v-row>
      <v-col
        v-for="item in filteredItems"
        :key="item.title"
        :cols="12"
        :sm="6"
        :md="4"
      >
        <v-card
          :aria-label="item.title"
          :min-height="180"
          :to="item.path"
        >
          <v-card-item>
            <template #prepend>
              <v-icon
                :icon="item.icon"
                color="primary"
              />
            </template>
            <div class="font-weight-medium text-truncate-2 pr-8">
              {{ item.title }}
            </div>
          </v-card-item>
          <v-card-text>
            {{ item.description }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style lang="scss" scoped>
:deep(.v-card-title) {
  background: transparent !important;
}
</style>

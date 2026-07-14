<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  showCopyButton: {
    type: Boolean,
    default: true,
  },
  showReadAloudButton: {
    type: Boolean,
    default: true,
  },
  showRetryButton: {
    type: Boolean,
    default: false,
  },
  onRetry: {
    type: Function,
    default: null,
  },
});
</script>

<template>
  <div class="d-flex ga-1">
    <template v-if="props.showCopyButton">
      <AppCopyable
        v-slot="{ copy, tooltip }"
        :text="props.text"
      >
        <AppIconButton
          :tooltip="tooltip"
          icon="mdi-content-copy"
          variant="text"
          @click="copy"
        />
      </AppCopyable>
    </template>
    <template v-if="props.showReadAloudButton">
      <ChatSpeechSynthesis
        v-slot="{ isPlaying, isSupported, speak, stop }"
        :speech-id="strUtils.generateRandom()"
        :text="markdownUtils.removeHeadings(props.text)"
      >
        <AppIconButton
          v-if="isSupported"
          :icon="isPlaying ? 'mdi-stop-circle' : 'mdi-volume-high'"
          :tooltip="isPlaying ? $t('__actionReadAloudStop') : $t('__actionReadAloudStart')"
          variant="text"
          @click="() => {
            isPlaying ? stop() : speak();
          }"
        />
      </ChatSpeechSynthesis>
    </template>
    <template v-if="props.showRetryButton">
      <AppIconButton
        :tooltip="$t('__actionRetry')"
        icon="mdi-refresh"
        variant="text"
        @click="props.onRetry"
      />
    </template>
  </div>
</template>

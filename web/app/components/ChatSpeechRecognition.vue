<script setup>
const props = defineProps({
  onRecord: {
    type: Function,
    default: () => {},
  },
});

const customLocale = useCustomLocale();

const {
  isFinal,
  isListening,
  isSupported,
  result,
  start,
  stop,
} = useSpeechRecognition({
  lang: customLocale.localLocale,
});

const state = reactive({
  index: 0,
  texts: [],
  manualStop: false,
});

const startRecording = () => {
  state.manualStop = false;
  start();
};

const stopRecording = () => {
  state.manualStop = true;
  state.index = 0;
  state.texts = [];
  stop();
};

watch(result, (after) => {
  state.texts[state.index] = after;
  props.onRecord(state.texts);
});

watch(isFinal, (after) => {
  if (after) {
    nextTick(() => {
      state.index += 1;
    });
  }
});

watch(isListening, (after) => {
  // Auto-restart when the browser stops listening
  if (!after && !state.manualStop) {
    start();
  }
});
</script>

<template>
  <slot
    :is-listening="isListening"
    :is-supported="isSupported"
    :result="result"
    :start="startRecording"
    :stop="stopRecording"
  />
</template>

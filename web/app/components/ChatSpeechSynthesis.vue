<script setup>
const props = defineProps({
  speechId: {
    type: String,
    default: '',
  },
  text: {
    type: String,
    required: true,
  },
});

const speechSynthesisStore = useSpeechSynthesisStore();

const state = reactive({
  isPlaying: false,
});

watch(() => speechSynthesisStore.isPlaying, (after) => {
  state.isPlaying = after && speechSynthesisStore.speechId === props.speechId;
});

onBeforeUnmount(() => {
  speechSynthesisStore.stop();
});
</script>

<template>
  <slot
    :is-playing="state.isPlaying"
    :is-supported="speechSynthesisStore.isSupported"
    :speak="() => {
      state.isPlaying = true;
      speechSynthesisStore.speak(props.text, props.speechId);
    }"
    :stop="() => {
      state.isPlaying = false;
      speechSynthesisStore.stop();
    }"
  />
</template>

import { defineStore } from 'pinia';

const voiceLangs = {
  'en': 'en-US',
  'zh-TW': 'zh-TW',
};

export const useSpeechSynthesisStore = defineStore('speechSynthesis', () => {
  const customLocale = useCustomLocale();

  const voices = ref([]);
  const voice = ref();
  const text = ref();
  const speechId = ref();

  const {
    isPlaying,
    isSupported,
    speak,
    stop,
  } = useSpeechSynthesis(text, {
    lang: customLocale.localLocale,
    voice,
  });

  setTimeout(() => {
    voices.value = window.speechSynthesis.getVoices();
    const isGoogleVoice = voice => /Google/i.test(`${voice.voiceURI}-${voice.name}`);
    voices.value.sort((a, b) => isGoogleVoice(a) ? -1 : isGoogleVoice(b) ? 1 : 0);
    voice.value = voices.value.find(voice => voice.lang === voiceLangs[customLocale.localLocale.value]);
  }, 100);

  const setText = (value) => {
    text.value = value;
  };

  const setSpeechId = (value) => {
    speechId.value = value;
  };

  const start = (text, speechId = '') => {
    setText(text);
    setSpeechId(speechId);
    speak();
  };

  watch(customLocale.localLocale, (after) => {
    voice.value = voices.value.find(voice => voice.lang === voiceLangs[after]);
  });

  return {
    isPlaying,
    isSupported,
    setText,
    speak: start,
    speechId,
    stop,
    text,
  };
});

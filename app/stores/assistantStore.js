import { defineStore } from 'pinia';

export const useAssistantStore = defineStore('assistant', () => {
  const isOpen = ref(false);
  const messages = ref([]);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const setMessages = (value = []) => {
    messages.value = value;
  };

  return {
    isOpen,
    messages,
    open,
    close,
    setMessages,
  };
});

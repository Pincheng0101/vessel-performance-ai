<script setup>
const props = defineProps({
  path: {
    type: String,
    required: true,
  },
});

const agentChatStore = useAgentChatStore();
const server = useServer();
const snackbarStore = useSnackbarStore();
const { t } = useI18n();

const handleClick = async () => {
  const { data, error } = await server.storageObject.download({
    storageId: agentChatStore.storageId,
    objectPath: props.path,
  });
  if (error.value || !data.value?.presignedUrl) {
    snackbarStore.setFailure(t('__messageAgentWorkspaceFileNotFound'));
    return;
  }
  fileUtils.download({
    url: data.value.presignedUrl,
    fileName: props.path.split('/').at(-1),
  });
};
</script>

<template>
  <a
    role="button"
    class="text-primary"
    @click="handleClick"
  >
    /tmp/workspace/{{ props.path }}
    <v-icon
      icon="mdi-file-download-outline"
      size="x-small"
    />
  </a>
</template>

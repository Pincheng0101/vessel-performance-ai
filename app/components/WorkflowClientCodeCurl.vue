<script setup>
import getExecution from '~/code-examples/shell/get-execution.bash?raw';
import startExecution from '~/code-examples/shell/start-execution.bash?raw';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const { serverApiUrl } = useRuntimeConfig().public;

const displayFieldSettings = {
  isShellCode: true,
  editorOptions: {
    maxLines: 10,
    readonly: false,
  },
};

const a = computed(() => (
  startExecution
    .replace('___PLACEHOLDER_BASE_URL___', serverApiUrl)
    .replace('___PLACEHOLDER_PAYLOAD___', formatPayload(props.formData))
));

const formatPayload = (json) => {
  return JSON.stringify(json, null, 2).replaceAll('\n', '\n  ');
};
</script>

<template>
  <AppDisplayFieldGroup
    :items="[
      {
        title: $t('__titleStartExecution'),
        value: a,
        ...displayFieldSettings,
      },
      {
        title: $t('__titleGetExecutionResults'),
        value: getExecution
          .replace('___PLACEHOLDER_BASE_URL___', serverApiUrl),
        ...displayFieldSettings,
      },
    ]"
  />
</template>

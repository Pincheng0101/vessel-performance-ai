<script setup>
import getExecution from '~/code-examples/node/get-execution.js?raw';
import startExecution from '~/code-examples/node/start-execution.js?raw';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const { serverApiUrl } = useRuntimeConfig().public;

const displayFieldSettings = {
  isJavaScriptCode: true,
  editorOptions: {
    maxLines: 10,
    readonly: false,
  },
};

const formatPayload = (json) => {
  return JSON.stringify(json, null, 2)
    .replaceAll('"', '\'')
    .replaceAll('\n', '\n  ');
};
</script>

<template>
  <AppDisplayFieldGroup
    :items="[
      {
        title: $t('__titleStartExecution'),
        value: startExecution
          .replace('___PLACEHOLDER_BASE_URL___', serverApiUrl)
          .replace('___PLACEHOLDER_PAYLOAD___', formatPayload(props.formData)),
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

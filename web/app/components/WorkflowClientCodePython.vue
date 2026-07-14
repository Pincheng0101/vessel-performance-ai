<script setup>
import getExecution from '~/code-examples/python/get-execution.py?raw';
import startExecution from '~/code-examples/python/start-execution.py?raw';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const { serverApiUrl } = useRuntimeConfig().public;

const displayFieldSettings = {
  isPythonCode: true,
  editorOptions: {
    maxLines: 10,
    readonly: false,
  },
};

const formatPayload = (json) => {
  return JSON.stringify(json, null, 2)
    .replaceAll('null', 'None')
    .replaceAll('true', 'True')
    .replaceAll('false', 'False');
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

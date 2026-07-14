<script setup>
import connectAgent from '~/code-examples/python/connect-agent.py?raw';
import startAgent from '~/code-examples/python/start-agent.py?raw';

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
        title: $t('__titleStartAgent'),
        value: startAgent
          .replace('___PLACEHOLDER_BASE_URL___', serverApiUrl)
          .replace('___PLACEHOLDER_PAYLOAD___', formatPayload(props.formData)),
        ...displayFieldSettings,
      },
      {
        title: $t('__titleConnectAgent'),
        value: connectAgent
          .replace('___PLACEHOLDER_AGENT_ID___', props.formData.agent_id),
        ...displayFieldSettings,
      },
    ]"
  />
</template>

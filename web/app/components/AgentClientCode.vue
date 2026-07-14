<script setup>
import AgentClientCodeNode from '~/components/AgentClientCodeNode';
import AgentClientCodePython from '~/components/AgentClientCodePython';
import AgentClientCodeShell from '~/components/AgentClientCodeShell';
import { ClientCodeConstant } from '~/constants';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const tabs = [
  {
    title: ClientCodeConstant.Type.SHELL.title,
    value: ClientCodeConstant.Type.SHELL.value,
    icon: ClientCodeConstant.Type.SHELL.icon,
    component: AgentClientCodeShell,
  },
  {
    title: ClientCodeConstant.Type.PYTHON.title,
    value: ClientCodeConstant.Type.PYTHON.value,
    icon: ClientCodeConstant.Type.PYTHON.icon,
    component: AgentClientCodePython,
  },
  {
    title: ClientCodeConstant.Type.NODE_JS.title,
    value: ClientCodeConstant.Type.NODE_JS.value,
    icon: ClientCodeConstant.Type.NODE_JS.icon,
    component: AgentClientCodeNode,
  },
];
</script>

<template>
  <AppTabs
    :items="tabs"
    :append-query="false"
    show-divider
  >
    <template
      v-for="tab in tabs"
      :key="tab.value"
      #[tab.value]
    >
      <component
        :is="tab.component"
        :form-data="props.formData"
        :max-lines="20"
        is-dialog-mode
      />
    </template>
  </AppTabs>
</template>

<script setup>
import { ResourceConstant } from '~/constants';
import { Agent } from '~/models/server/agent';

/**
 * @type {{ resource: Agent }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const fieldsRef = ref(null);

const state = reactive({
  /**
   * @type {Agent}
   */
  formData: new Agent(),
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

// Persists the admin-only credit config for the given agent id. Passed to
// `onSubmit` so the page controls ordering (create agent -> sync config ->
// navigate).
const syncCreditConfig = async (agentId) => {
  const isSynced = await fieldsRef.value?.syncCreditConfig?.(agentId);
  return isSynced ?? true;
};

const submit = async () => {
  const formData = objUtils.toRaw({
    ...state.formData,
    agentPrompt: strUtils.isEmpty(state.formData.agentPrompt) ? null : state.formData.agentPrompt,
    description: strUtils.isEmpty(state.formData.description) ? null : state.formData.description,
  });
  await props.onSubmit(formData, syncCreditConfig);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldAgent') })"
    :icon="ResourceConstant.Type.AGENT.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceAgentFormFields
        ref="fieldsRef"
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </template>
  </AppForm>
</template>

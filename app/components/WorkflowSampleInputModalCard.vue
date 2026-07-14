<script setup>
const props = defineProps({
  inputSchema: {
    type: Object,
    default: null,
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const { simulatedOutputMap, updateSimulatedOutputMap } = useWorkflow();

const form = ref(null);

const state = reactive({
  input: {},
  isLoading: false,
});

const initializeInput = () => {
  state.input = simulatedOutputMap.value.get('input') || {};
};

const start = async () => {
  if (!(await form.value.validate()).valid) return;

  state.isLoading = true;
  // For better visual experience
  await delay(500);
  updateSimulatedOutputMap({
    sampleInput: state.input,
  });
  state.isLoading = false;
};

initializeInput();
</script>

<template>
  <WorkflowModalCard
    :title="$t('__titleSetSampleInput')"
    :on-cancel="props.onCancel"
  >
    <template #actions>
      <AppButton
        :aria-label="$t('__actionSave')"
        :height="32"
        :text="$t('__actionSave')"
        :loading="state.isLoading"
        color="primary"
        size="small"
        variant="flat"
        @click="start"
      />
    </template>
    <template #body>
      <v-form
        ref="form"
        @submit.prevent=""
      >
        <template v-if="props.inputSchema">
          <AppJsonSchemaRendererInputGroup
            v-model:form-data="state.input"
            :label="$t('__fieldInput')"
            :schema="props.inputSchema"
            :validate-with-schema="false"
          />
        </template>
        <template v-else>
          <AppJsonEditor
            v-model:object="state.input"
            :label="$t('__fieldInput')"
            :height="300"
          />
        </template>
      </v-form>
    </template>
  </WorkflowModalCard>
</template>

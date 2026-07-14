<script setup>
import { ActionExecutionConstant, StatusConstant } from '~/constants';
import { ActionExecution } from '~/models/server/actionExecution';

const props = defineProps({
  stateDefinition: {
    type: Object,
    default: () => ({}),
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const server = useServer();
const { simulatedOutputMap, updateSimulatedOutputMap } = useWorkflow();

const form = ref(null);

const state = reactive({
  /**
   * @type {ActionExecution}
   */
  execution: null,
  error: null,
  isLoading: false,
  stopPolling: false,
  input: {},
  inputTemplate: {},
  inputSchema: {},
  externalMemoryInput: {},
  externalMemoryInputTemplate: {},
  externalMemoryInputSchema: {},
});

const initializeState = () => {
  const { inputTemplate, externalMemoryInputTemplate } = jsonPathUtils.generateTemplate(props.stateDefinition.parameters.payload);
  state.inputTemplate = inputTemplate;
  state.externalMemoryInputTemplate = externalMemoryInputTemplate;

  state.inputSchema = jsonSchemaUtils.generateFromJson(inputTemplate);
  state.externalMemoryInputSchema = jsonSchemaUtils.generateFromJson(externalMemoryInputTemplate);

  const source = {};
  for (const key of Object.keys(inputTemplate)) {
    for (const [, output] of simulatedOutputMap.value.entries()) {
      if (output && typeof output === 'object' && Object.hasOwn(output, key)) {
        source[key] = output[key];
        break;
      }
    }
  }

  state.input = objUtils.fillByTemplate(inputTemplate, source, [ActionExecutionConstant.ExternalMemoryParams.EXTERNAL_MEMORY_ID_KEY]);
  state.externalMemoryInput = externalMemoryInputTemplate;
};

initializeState();

const isInputTemplateEmpty = computed(() => {
  return objUtils.isEmpty(state.inputTemplate);
});

const isExternalMemoryInputTemplateEmpty = computed(() => {
  return objUtils.isEmpty(state.externalMemoryInputTemplate);
});

const isInitialStateWithoutInputs = computed(() => {
  return isInputTemplateEmpty.value && isExternalMemoryInputTemplateEmpty.value && !state.isLoading && !state.execution;
});

const start = async () => {
  if (!(await form.value.validate()).valid) return;
  await startActionExecution({
    actionPayload: props.stateDefinition.parameters.payload,
    input: objUtils.parseStringLiteral(state.input),
    stateDefinitionName: props.stateDefinition.name,
    externalMemoryInput: objUtils.parseStringLiteral(state.externalMemoryInput),
  });
};

const cancel = () => {
  state.stopPolling = true;
  props.onCancel();
};

const getActionExecution = async (executionArn) => {
  if (!executionArn) return;
  if (state.stopPolling) return;
  state.isLoading = true;
  const { data, error } = await server.actionExecution.get({ executionArn });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  state.execution = data.value;
  if (state.execution.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    await getActionExecution(executionArn);
    return;
  }
  state.isLoading = false;
};

const startActionExecution = async ({
  actionPayload,
  input,
  stateDefinitionName,
  externalMemoryInput,
}) => {
  state.isLoading = true;
  state.execution = new ActionExecution({
    status: StatusConstant.Runtime.PENDING.value,
  });
  const { data, error } = await server.actionExecution.start({
    actionPayload,
    input,
    externalMemoryInput,
  });
  if (error.value) {
    state.error = error.value.data;
    state.isLoading = false;
    return;
  }
  state.stopPolling = false;
  await getActionExecution(data.value.executionArn);
  if (!state.execution) return;
  updateSimulatedOutputMap({
    stateName: stateDefinitionName,
    actionOutput: state.execution.actionOutput,
  });
};
</script>

<template>
  <WorkflowModalCard
    :title="$t('__titleTestAction', { action: props.stateDefinition.name })"
    :on-cancel="cancel"
  >
    <template #actions>
      <template v-if="!isInitialStateWithoutInputs">
        <AppButton
          :aria-label="$t('__actionStart')"
          :height="32"
          :loading-size="12"
          :loading="state.isLoading"
          :text="$t('__actionStart')"
          color="primary"
          size="small"
          variant="flat"
          @click="start"
        />
      </template>
    </template>
    <template #body>
      <v-form
        ref="form"
        @submit.prevent=""
      >
        <template v-if="!isInputTemplateEmpty">
          <AppJsonSchemaRendererInputGroup
            v-model:form-data="state.input"
            :label="$t('__fieldTestInput')"
            :schema="state.inputSchema"
            :validate-with-schema="false"
          />
        </template>
        <template v-if="!isExternalMemoryInputTemplateEmpty">
          <AppJsonSchemaRendererInputGroup
            v-model:form-data="state.externalMemoryInput"
            :label="$t('__fieldTestExternalMemoryInput')"
            :schema="state.externalMemoryInputSchema"
            :validate-with-schema="false"
          />
        </template>
        <template v-if="isInitialStateWithoutInputs">
          <v-sheet
            :min-height="200"
            color="transparent"
            class="d-flex align-center justify-center"
          >
            <AppButton
              :aria-label="$t('__actionStart')"
              :loading="state.isLoading"
              :text="$t('__actionStart')"
              color="primary"
              class="mx-1"
              @click="start"
            />
          </v-sheet>
        </template>
      </v-form>
      <template v-if="state.error">
        <AppDisplayFieldGroup
          :items="[
            { title: $t('__fieldError'), value: state.error, isJsonToMarkdown: true },
          ]"
        />
      </template>
      <template v-else-if="state.execution">
        <AppDisplayFieldGroup :items="state.execution.displayFields" />
      </template>
    </template>
  </WorkflowModalCard>
</template>

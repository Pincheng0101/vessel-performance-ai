<script setup>
import { ActionExecutionConstant, StatusConstant } from '~/constants';

const props = defineProps({
  inputExamples: {
    type: undefined,
    default: null,
  },
  runtimeType: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const code = defineModel('code', {
  type: String,
  default: null,
});

const loading = defineModel('loading', {
  type: Boolean,
  default: false,
});

const dialogRef = ref(null);

const state = reactive({
  executionError: null,
  formData: {
    description: '',
    inputExamples: null,
    inputSchema: null,
    runtimeType: null,
    sessionId: null,
  },
});

const server = useServer();
const { createSignal } = useAbortController();
const signal = createSignal();

const createInputExamples = () => {
  if (props.inputExamples === null || props.inputExamples === undefined) return null;
  return Array.isArray(props.inputExamples) ? props.inputExamples : [props.inputExamples];
};

const resetFormDefaults = () => {
  state.formData.runtimeType = props.runtimeType;
  state.formData.inputExamples = createInputExamples();
};

resetFormDefaults();

const generate = async (formData) => {
  const { data, error } = await server.copilot.startCodeAction(formData);
  if (signal.aborted) return;
  if (error.value) {
    loading.value = false;
    return;
  }
  return data.value;
};

const fetchActionExecution = async (executionArn) => {
  const { data, error } = await server.actionExecution.get({ executionArn });
  if (signal.aborted) return;
  if (error.value) {
    state.executionError = error.value.data;
    return;
  }
  if (data.value.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return await fetchActionExecution(executionArn);
  }
  return data.value;
};

const handleSubmit = async (formData) => {
  state.formData = formData;
  loading.value = true;
  dialogRef.value.close();
  const result = await generate(formData);
  if (result?.sessionId) {
    state.formData.sessionId = result.sessionId;
  }
  if (result?.executionArn) {
    const actionExecution = await fetchActionExecution(result.executionArn);
    const generatedCode = actionExecution.actionOutput?.response?.code;
    if (generatedCode) {
      code.value = generatedCode;
      props.onUpdate();
    }
  }
  loading.value = false;
};

watch(() => props.runtimeType, (after) => {
  state.formData.runtimeType = after;
});

watch(() => props.inputExamples, () => {
  state.formData.inputExamples = createInputExamples();
}, { deep: true });
</script>

<template>
  <AppDialog
    ref="dialogRef"
    :on-submit="handleSubmit"
  >
    <template #activator="{ onOpen }">
      <div class="d-flex align-center">
        <div :class="{ 'gradient-button-border': !loading }">
          <AppButton
            variant="flat"
            class="px-3 w-auto border-0"
            :text="loading ? $t('__actionGenerating') : $t('__actionGenerate')"
            :tooltip="$t('__actionGenerateCode')"
            :disabled="loading"
            :prepend-icon="loading ? 'mdi-creation' : 'mdi-auto-fix'"
            @click="onOpen"
          />
        </div>
      </div>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <CodeGenerateForm
        :item="state.formData"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

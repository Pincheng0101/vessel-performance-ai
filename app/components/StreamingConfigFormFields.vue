<script setup>
import { TaskStreamingConfig, TaskStreamingPhaseConfig } from '~/models/workflow/state/task';

const props = defineProps({
  formData: {
    type: Object,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [Object, String],
  default: null,
});

const state = reactive({
  enableStreamingBeforeAction: false,
  enableStreamingAfterAction: false,
  streamingConfig: new TaskStreamingConfig({
    beforeAction: null,
    afterAction: null,
  }),
});

const migrateLegacyStreamingConfig = () => {
  const hasLegacyKeys = ['name', 'outputSelector'].some(key => Object.hasOwn(model.value, key));
  if (!hasLegacyKeys) return false;
  state.enableStreamingAfterAction = true;
  state.streamingConfig.afterAction = new TaskStreamingPhaseConfig({
    name: model.value.name,
    outputSelector: model.value.outputSelector,
  });
  model.value = state.streamingConfig;
  return true;
};

const initializeState = () => {
  if (!model.value) return;
  if (migrateLegacyStreamingConfig()) return;
  state.enableStreamingBeforeAction = !!model.value.beforeAction;
  state.enableStreamingAfterAction = !!model.value.afterAction;
  state.streamingConfig = model.value;
};

initializeState();

const updateModelValue = () => {
  model.value = state.streamingConfig;
  if (model.value && !model.value.beforeAction && !model.value.afterAction) {
    model.value = null;
  }
};

const handleEnableStreamingBeforeActionChange = (v) => {
  state.streamingConfig.beforeAction = v
    ? new TaskStreamingPhaseConfig({
        name: `${props.formData.data.stateDefinition.name}_Start`,
        outputSelector: null,
      })
    : null;
  updateModelValue();
  props.onUpdate();
};

const handleEnableStreamingAfterActionChange = (v) => {
  state.streamingConfig.afterAction = v
    ? new TaskStreamingPhaseConfig({
        name: `${props.formData.data.stateDefinition.name}_End`,
        outputSelector: null,
      })
    : null;
  updateModelValue();
  props.onUpdate();
};
</script>

<template>
  <StreamingPhaseConfigFormFields
    v-model="state.streamingConfig.beforeAction"
    v-model:enable-streaming="state.enableStreamingBeforeAction"
    :label="$t('__fieldEnableStreamingBeforeAction')"
    :tooltip="$t('__tooltipWorkflowActionStreamingBeforeAction')"
    :output-selector-tooltip="$t('__tooltipWorkflowActionStreamingBeforeActionOutputSelector')"
    :on-enable-streaming-change="handleEnableStreamingBeforeActionChange"
    :on-update="props.onUpdate"
  />
  <StreamingPhaseConfigFormFields
    v-model="state.streamingConfig.afterAction"
    v-model:enable-streaming="state.enableStreamingAfterAction"
    :label="$t('__fieldEnableStreamingAfterAction')"
    :tooltip="$t('__tooltipWorkflowActionStreamingAfterAction')"
    :output-selector-tooltip="$t('__tooltipWorkflowActionStreamingAfterActionOutputSelector')"
    :on-enable-streaming-change="handleEnableStreamingAfterActionChange"
    :on-update="props.onUpdate"
  />
</template>

<script setup>
import { TaskStreamingPhaseConfig } from '~/models/workflow/state/task';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  tooltip: {
    type: String,
    default: '',
  },
  outputSelectorTooltip: {
    type: String,
    default: '',
  },
  onEnableStreamingChange: {
    type: Function,
    default: () => {},
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

const enableStreaming = defineModel('enableStreaming', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id }"
    :label="props.label"
    :tooltip="props.tooltip"
  >
    <AppSwitch
      :id="id"
      v-model="enableStreaming"
      @update:model-value="props.onEnableStreamingChange"
    />
  </AppInputGroup>
  <template v-if="enableStreaming">
    <ReferencePathInputGroup
      v-model="model"
      :default-value="new TaskStreamingPhaseConfig()"
      :label="$t('__fieldStreamingSettings')"
      :bordered="!jsonPathUtils.isJsonPath(model)"
      :on-update="props.onUpdate"
    >
      <ReferencePathInputGroup
        v-model="model.name"
        :label="$t('__fieldName')"
        :tooltip="$t('__tooltipWorkflowActionStreamingSettingsName')"
        :on-update="props.onUpdate"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="model.name"
            @update:model-value="(v) => {
              if (strUtils.isEmpty(v)) {
                model.name = null;
              }
              props.onUpdate();
            }"
          />
        </template>
      </ReferencePathInputGroup>
      <ReferencePathInputGroup
        v-model="model.outputSelector"
        :label="$t('__fieldOutputSelector')"
        :tooltip="props.outputSelectorTooltip"
        :on-update="props.onUpdate"
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="model.outputSelector"
            :rules="(
              $validator
                .defineField(label)
                .json()
                .collect()
            )"
            @update:object="props.onUpdate"
          />
        </template>
      </ReferencePathInputGroup>
    </ReferencePathInputGroup>
  </template>
</template>

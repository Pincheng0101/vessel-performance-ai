<script setup>
import { python } from '@codemirror/lang-python';
import { FileExtensionConstant } from '~/constants';

const props = defineProps({
  defaultValue: {
    type: [String, Object],
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  loadingText: {
    type: String,
    default: null,
  },
});

const injectedLabel = inject('inputGroupLabel', '');

const model = defineModel({
  type: String,
  default: '',
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}
</script>

<template>
  <AppEditor
    v-model="model"
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorPython')"
    :loading-text="props.loadingText"
    :download-file-extension="FileExtensionConstant.Base.PY.value"
    :download-type="FileExtensionConstant.Base.PY.mediaType"
    :extensions="[
      python(),
    ]"
  >
    <template
      v-if="$slots['prepend-tools']"
      #prepend-tools
    >
      <slot name="prepend-tools" />
    </template>
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
  </AppEditor>
</template>

<script setup>
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import * as FileExtensionConstant from '~/constants/FileExtensionConstant';

const props = defineProps({
  defaultValue: {
    type: [String, Object],
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
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
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorShell')"
    :download-file-extension="FileExtensionConstant.Base.SH.value"
    :download-type="FileExtensionConstant.Base.SH.mediaType"
    :extensions="[
      StreamLanguage.define(shell),
    ]"
  >
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
  </AppEditor>
</template>

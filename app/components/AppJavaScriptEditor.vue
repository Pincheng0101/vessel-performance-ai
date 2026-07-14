<script setup>
import { javascript } from '@codemirror/lang-javascript';
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
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorJavaScript')"
    :download-file-extension="FileExtensionConstant.Base.JS.value"
    :download-type="FileExtensionConstant.Base.JS.mediaType"
    :extensions="[
      javascript(),
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

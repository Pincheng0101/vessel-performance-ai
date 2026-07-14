<script setup>
import { markdown } from '@codemirror/lang-markdown';
import { FileExtensionConstant } from '~/constants';

const props = defineProps({
  id: {
    type: String,
    default: undefined,
  },
  defaultValue: {
    type: [String, Object],
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: Array,
    default: () => [],
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
    :id="props.id"
    v-model="model"
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorMarkdown')"
    :download-file-extension="FileExtensionConstant.Base.MD.value"
    :download-type="FileExtensionConstant.Base.MD.mediaType"
    :extensions="[
      markdown(),
    ]"
    :rules="props.rules"
    :loading="props.loading"
    :disabled="props.disabled"
    enable-line-wrapping
  >
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
    <template
      v-if="$slots['prepend-tools']"
      #prepend-tools
    >
      <slot name="prepend-tools" />
    </template>
  </AppEditor>
</template>

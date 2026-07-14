<script setup>
import { StreamLanguage } from '@codemirror/language';
import { jinja2 } from '@codemirror/legacy-modes/mode/jinja2';
import { FileExtensionConstant, RegexConstant } from '~/constants';

const props = defineProps({
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
  extensions: {
    type: Array,
    default: () => [],
  },
  autocompletionOverride: {
    type: Array,
    default: () => [],
  },
  maxLines: {
    type: Number,
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

const formatVariable = (v) => {
  if (!v) return '';
  const variableRegex = RegexConstant.Jinja.VARIABLE_REGEX;
  return v.replace(variableRegex, '{{ $1 }}');
};

const editorExtensions = computed(() => [
  StreamLanguage.define(jinja2),
  ...props.extensions,
]);
</script>

<template>
  <AppEditor
    v-model="model"
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorJinja')"
    :download-file-extension="FileExtensionConstant.Base.JINJA.value"
    :download-type="FileExtensionConstant.Base.JINJA.mediaType"
    :extensions="editorExtensions"
    :mutators="[
      formatVariable,
    ]"
    :autocompletion-override="props.autocompletionOverride"
    enable-line-wrapping
    :loading="props.loading"
    :disabled="props.disabled"
    :max-lines="props.maxLines"
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

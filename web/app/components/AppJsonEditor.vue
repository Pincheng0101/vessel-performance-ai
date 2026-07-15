<script setup>
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { lintGutter, linter } from '@codemirror/lint';
import { jsonPathBindingLinter } from '~/codemirror/linters';
import * as FileExtensionConstant from '~/constants/FileExtensionConstant';

const props = defineProps({
  defaultValue: {
    type: [String, Number, Object],
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  highlightKey: {
    type: String,
    default: '',
  },
  linters: {
    type: Array,
    default: () => [],
  },
  enableJsonLinter: {
    type: Boolean,
    default: true,
  },
  enableJsonPathBindingLinter: {
    type: Boolean,
    default: false,
  },
  enableLintGutter: {
    type: Boolean,
    default: false,
  },
  allowPrimitive: {
    type: Boolean,
    default: false,
  },
});

const injectedLabel = inject('inputGroupLabel', '');

const model = defineModel({
  type: String,
  default: '',
});

const object = defineModel('object', {
  type: [Object, String, Number, Boolean],
  default: null,
  set(value) {
    if (typeof value === 'object') {
      previousObject.value = value;
    }
    return value;
  },
});

const isFocused = defineModel('isFocused', {
  type: Boolean,
  default: false,
});

const previousObject = ref(object.value);

const editorRef = ref(null);

const isEmptyObject = computed(() => objUtils.isEmpty(object.value));
const isEmptyArray = computed(() => arrUtils.isEmpty(object.value));

const format = (value) => {
  if (strUtils.isEmpty(value)) return '';
  if (isEmptyObject.value) return '{\n  \n}';
  if (isEmptyArray.value) return '[\n  \n]';
  return jsonUtils.safeBeautify(value);
};

if (object.value) {
  model.value = format(object.value);
}

if (props.defaultValue) {
  object.value = typeof props.defaultValue === 'object' ? props.defaultValue : jsonUtils.safeParse(props.defaultValue);
  model.value = typeof props.defaultValue === 'object' ? format(props.defaultValue) : props.defaultValue;
}

const customizedLinters = computed(() => {
  return props.linters.map(func => typeof func === 'function' ? linter(func()) : null).filter(Boolean);
});

const extensions = computed(() => {
  return [
    json(),
    props.enableJsonLinter ? linter(jsonParseLinter()) : null,
    props.enableJsonPathBindingLinter ? linter(jsonPathBindingLinter()) : null,
    props.enableLintGutter ? lintGutter() : null,
    ...customizedLinters.value,
  ].filter(Boolean);
});

watch(() => props.defaultValue, (after) => {
  model.value = format(after);
});

watch(object, (after) => {
  if (after === null) {
    model.value = '';
    return;
  }
  if (objUtils.isEmpty(after)) {
    return;
  }
  model.value = format(after);
}, { deep: true });

watch(model, (after) => {
  if (strUtils.isEmpty(after)) {
    object.value = null;
    return;
  }
  if (props.enableJsonLinter && jsonUtils.isValid(after)) {
    object.value = jsonUtils.safeParse(after);
    return;
  }
  object.value = jsonUtils.safeParse(after) ?? after;
});

watch(() => props.highlightKey, (key) => {
  if (key) {
    editorRef.value.setHighlightedBlock({ startsWith: `"${key}"` });
    return;
  }
  editorRef.value.clearHighlightedBlock();
});

watch(isFocused, (after) => {
  // On blur, if primitive values are not allowed and the current value is primitive, restore the previous object
  if (!after && !props.allowPrimitive && model.value && !(typeof model.value === 'object')) {
    object.value = previousObject.value;
  }
});
</script>

<template>
  <AppEditor
    ref="editorRef"
    v-model="model"
    v-model:is-focused="isFocused"
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorJson')"
    :download-file-extension="FileExtensionConstant.Base.JSON.value"
    :download-type="FileExtensionConstant.Base.JSON.mediaType"
    :extensions="extensions"
    :mutators="[
      format,
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

<script setup>
import { FormConstant } from '~/constants';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  defaultValue: {
    type: [String, Object],
    default: null,
  },
  enableAnchors: {
    type: Boolean,
    default: false,
  },
  enableToc: {
    type: Boolean,
    default: false,
  },
  anchorPrefix: {
    type: String,
    default: '',
  },
  downloadFileName: {
    type: String,
    default: '',
  },
  initialViewMode: {
    type: String,
    default: FormConstant.ViewMode.MODE_MARKDOWN,
  },
  maxHeight: {
    type: Number,
    default: undefined,
  },
  width: {
    type: Number,
    default: undefined,
  },
});

const state = reactive({
  viewMode: props.initialViewMode,
});

const markdown = computed(() => markdownUtils.toMarkdown(props.defaultValue, { ignoredHeadings: ['_lfe_system'] }));
const isJson = computed(() => typeof props.defaultValue === 'object' || jsonUtils.isObject(props.defaultValue));
</script>

<template>
  <template v-if="state.viewMode === FormConstant.ViewMode.MODE_MARKDOWN">
    <AppMarkdownViewer
      :default-value="markdown"
      :enable-anchors="props.enableAnchors"
      :enable-toc="props.enableToc"
      :anchor-prefix="props.anchorPrefix"
      :download-file-name="props.downloadFileName"
      :max-height="props.maxHeight"
      :width="props.width"
      :on-json-mode-toggle="isJson ? () => { state.viewMode = FormConstant.ViewMode.MODE_JSON } : null"
    />
  </template>
  <template v-else>
    <AppJsonEditor
      :aria-label="props.ariaLabel"
      :default-value="props.defaultValue"
      :on-text-mode-toggle="() => { state.viewMode = FormConstant.ViewMode.MODE_MARKDOWN }"
      fill-height
    />
  </template>
</template>

<script setup>
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { EditorView, crosshairCursor, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { githubDarkInit, githubLightInit } from '@uiw/codemirror-theme-github';
import * as FileExtensionConstant from '~/constants/FileExtensionConstant';

/**
 * @import { CreateThemeOptions } from '@uiw/codemirror-themes'
 */

const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  defaultValue: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hideDetails: {
    type: Boolean,
    default: false,
  },
  enableLineWrapping: {
    type: Boolean,
    default: false,
  },
  dialogTitle: {
    type: String,
    default: 'Editor',
  },
  isDialogMode: {
    type: Boolean,
    default: false,
  },
  hint: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
  extensions: {
    type: Array,
    default: () => [],
  },
  mutators: {
    type: Array,
    default: () => [],
  },
  maxLines: {
    type: Number,
    default: 10,
  },
  minLines: {
    type: Number,
    default: 5,
  },
  autocompletionOverride: {
    type: Array,
    default: () => [],
  },
  loadingText: {
    type: String,
    default: null,
  },
  downloadFileName: {
    type: String,
    default: 'editor',
  },
  downloadFileExtension: {
    type: String,
    default: FileExtensionConstant.Base.TXT.value,
  },
  downloadType: {
    type: String,
    default: FileExtensionConstant.Base.TXT.mediaType,
  },
  onBlur: {
    type: Function,
    default: () => {},
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
  onObjectUpdate: {
    type: Function,
    default: () => {},
  },
  onTextModeToggle: {
    type: Function,
    default: null,
  },
});

const PADDING_TOP = 28 + 16 - 2; // Toolbar button height + padding - border;
const PADDING_BOTTOM = 4;
const LINE_HEIGHT = 22.4;

const customTheme = useCustomTheme();
const {
  highlightedStateField,
  setHighlightedBlock,
  clearHighlightedBlock,
} = useEditor();

const model = defineModel({
  type: String,
  default: '',
});

const isFocused = defineModel('isFocused', {
  type: Boolean,
  default: false,
});

const dialogRef = ref(null);
const editorRef = ref(null);

const state = reactive({
  editorView: null,
  enableLineWrapping: false,
  ariaLabel: '',
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const readonly = computed(() => props.readonly || props.disabled || props.loading);

const normalizedDownloadFileExtension = computed(() => {
  if (!props.downloadFileExtension) return '';
  return props.downloadFileExtension.startsWith('.') ? props.downloadFileExtension : `.${props.downloadFileExtension}`;
});

const downloadFileName = computed(() => {
  const baseName = props.downloadFileName?.trim() || 'editor';
  const extension = normalizedDownloadFileExtension.value;
  if (!extension) return baseName;
  return baseName.toLowerCase().endsWith(extension.toLowerCase()) ? baseName : `${baseName}${extension}`;
});

const isDownloadDisabled = computed(() => {
  return props.disabled || props.loading || String(model.value ?? '').trim().length === 0;
});

const updateDoc = (doc) => {
  if (!state.editorView) return;
  // Keep the current selection
  const { selection: currentSelection } = state.editorView.state;
  const selection = {
    anchor: Math.min(currentSelection.main.anchor, doc?.length ?? 0),
    head: Math.min(currentSelection.main.head, doc?.length ?? 0),
  };
  state.editorView.dispatch({
    changes: {
      from: 0,
      to: state.editorView.state.doc.length,
      insert: appendBlankLines(doc ?? ''),
    },
    selection,
  });
};

const formatDoc = () => {
  const doc = props.mutators.reduce((acc, format) => format(acc), model.value);
  updateDoc(doc);
};

const downloadDoc = () => {
  if (isDownloadDisabled.value) return;
  fileUtils.download({
    data: model.value ?? '',
    fileName: downloadFileName.value,
    type: props.downloadType,
  });
};

const appendBlankLines = (doc) => {
  const normalized = doc ?? '';
  const withTrailing = normalized.endsWith('\n') ? normalized : `${normalized}\n`;
  const existing = withTrailing.split('\n').length;
  const missing = Math.max(0, props.minLines - existing);
  return `${withTrailing}${'\n'.repeat(missing)}`;
};

const handleUpdate = (update) => {
  if (update.docChanged) {
    const prevDoc = model.value;
    const nextDoc = update.state.doc.toString().trim();
    if (prevDoc !== nextDoc) {
      model.value = nextDoc;
      props.onUpdate(nextDoc);
      props.onObjectUpdate(jsonUtils.safeParse(nextDoc));
    }
  }
  if (update.focusChanged) {
    const { hasFocus } = update.view;
    // Format document if currently focused and about to lose focus
    if (isFocused.value && !hasFocus) {
      formatDoc();
      props.onBlur();
    }
    isFocused.value = hasFocus;
  }
};

/**
 * @type {CreateThemeOptions}
 */
const highlightSettings = {
  settings: {
    background: 'transparent',
    gutterBackground: '#ffffff',
    gutterForeground: '#6c6c6c',
  },
};

const lightHighlight = githubLightInit(highlightSettings);
const darkHighlight = githubDarkInit(highlightSettings);

const initEditorView = () => {
  state.editorView = new EditorView({
    parent: editorRef.value,
    state: EditorState.create({
      doc: String(model.value) || appendBlankLines(''),
      extensions: [
        autocompletion({
          override: props.autocompletionOverride.length > 0
            ? props.autocompletionOverride
            : null,
        }),
        ...(state.enableLineWrapping ? [EditorView.lineWrapping] : []),
        ...props.extensions,
        bracketMatching(),
        closeBrackets(),
        crosshairCursor(),
        customTheme.isDarkTheme.value ? darkHighlight : lightHighlight,
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.readOnly.of(readonly.value),
        EditorView.contentAttributes.of({ 'id': props.id, 'aria-label': state.ariaLabel }),
        EditorView.editable.of(!readonly.value),
        EditorView.updateListener.of(handleUpdate),
        foldGutter(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightedStateField,
        highlightSpecialChars(),
        history(),
        indentOnInput(),
        lineNumbers(),
        keymap.of([
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...foldKeymap,
          ...historyKeymap,
          ...lintKeymap,
          ...searchKeymap,
          ...standardKeymap,
          indentWithTab,
        ]),
        rectangularSelection(),
      ],
    }),
  });
  formatDoc();
};

const destroyEditorView = () => {
  if (state.editorView) {
    state.editorView.destroy();
  }
};

const toggleLineWrapping = () => {
  state.enableLineWrapping = !state.enableLineWrapping;
  destroyEditorView();
  initEditorView();
};

const focus = (pos = 0) => {
  const docLength = state.editorView.state.doc.length;
  const position = Math.min(pos, docLength);
  state.editorView.dispatch({
    selection: {
      anchor: position,
      head: position,
    },
  });
  state.editorView.focus();
};

const getAriaLabel = () => {
  return props.ariaLabel || (props.id && document.querySelector(`label[for="${props.id}"]`)?.textContent) || '';
};

const refreshEditorView = () => {
  destroyEditorView();
  initEditorView();
};

// Only update doc when model value changes externally and editor is not focused
watch(() => model.value, (after) => {
  if (isFocused.value) return;
  updateDoc(after);
});

watch(() => props.defaultValue, (after) => {
  if (after === undefined || after === null) return;
  if (after === model.value) return;
  model.value = after;
});

watch(customTheme.isDarkTheme, () => {
  refreshEditorView();
});

watch(readonly, (after, before) => {
  if (after === before) return;
  refreshEditorView();
});

onMounted(() => {
  state.enableLineWrapping = props.enableLineWrapping;
  state.ariaLabel = getAriaLabel();
  initEditorView();
});

onBeforeUnmount(() => {
  destroyEditorView();
});

defineExpose({
  setHighlightedBlock: params => setHighlightedBlock({ ...params, view: state.editorView }),
  clearHighlightedBlock: () => clearHighlightedBlock(state.editorView),
  focus,
});
</script>

<template>
  <AppInput
    v-model="model"
    :hint="props.hint"
    :rules="props.rules"
    :hide-details="props.hideDetails"
  >
    <v-sheet
      color="transparent"
      width="100%"
      class="editor-wrapper toolbar-wrapper position-relative"
      :class="{
        'editor-disabled': props.disabled,
        'editor-loading': props.loading,
      }"
    >
      <div ref="editorRef" />
      <div
        :data-aria-label="state.ariaLabel"
        class="d-none"
      >
        {{ model }}
      </div>
      <template v-if="$slots['append-inner']">
        <div class="append-icon">
          <slot name="append-inner" />
        </div>
      </template>
      <div class="toolbar d-flex align-center ga-2">
        <template v-if="$slots['prepend-tools']">
          <slot name="prepend-tools" />
        </template>
        <AppIconButton
          :icon="state.enableLineWrapping ? 'mdi-wrap-disabled' : 'mdi-wrap'"
          :tooltip="$t('__actionToggleLineWrapping')"
          variant="flat"
          :disabled="props.disabled || props.loading"
          :on-click="toggleLineWrapping"
        />
        <AppCopyable :text="model">
          <template #default="{ copy, tooltip }">
            <AppIconButton
              :tooltip="tooltip"
              icon="mdi-content-copy"
              variant="flat"
              :disabled="props.disabled || props.loading"
              :on-click="copy"
            />
          </template>
        </AppCopyable>
        <AppIconButton
          :tooltip="$t('__actionDownload')"
          icon="mdi-download"
          variant="flat"
          :disabled="isDownloadDisabled"
          :on-click="downloadDoc"
        />
        <template v-if="!props.isDialogMode && props.onTextModeToggle">
          <AppIconButton
            :tooltip="$t('__actionViewAsText')"
            icon="mdi-text-box-outline"
            variant="flat"
            :disabled="props.disabled || props.loading"
            :on-click="props.onTextModeToggle"
          />
        </template>
        <template v-if="!props.isDialogMode">
          <AppIconButton
            :tooltip="$t(readonly ? '__actionViewInDialog' : '__actionEditInDialog')"
            icon="mdi-open-in-new"
            variant="flat"
            :disabled="props.disabled || props.loading"
            :on-click="() => dialogRef.open()"
          />
        </template>
      </div>
      <v-overlay
        :model-value="props.loading"
        class="d-flex align-center justify-center"
        contained
        opacity="0.8"
        persistent
      >
        <AppProgressDots />
        <template v-if="props.loadingText">
          <span
            class="text-body-2 text-center text-primary mt-2"
            color="primary"
          >
            {{ props.loadingText }}
          </span>
        </template>
      </v-overlay>
    </v-sheet>
    <AppDialog
      ref="dialogRef"
      :width="1000"
      :persistent="false"
    >
      <template #body>
        <AppForm :form-title="props.dialogTitle">
          <template #actions>
            <AppIconButton
              icon="mdi-close"
              size="small"
              variant="text"
              :on-click="dialogRef.close"
            />
          </template>
          <template #body>
            <AppEditor
              v-bind="props"
              v-model="model"
              :default-value="model"
              is-dialog-mode
              :readonly="readonly"
            />
          </template>
        </AppForm>
      </template>
    </AppDialog>
  </AppInput>
</template>

<style lang="scss" scoped>
:deep(.cm-editor) {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  resize: vertical;
  overflow: auto;
  min-height: v-bind('`calc(${LINE_HEIGHT}px * ${props.minLines}  + ${PADDING_TOP + PADDING_BOTTOM}px)`');
  max-height: v-bind('props.isDialogMode ? "none" : `calc(${LINE_HEIGHT}px * ${props.maxLines} + ${PADDING_TOP + PADDING_BOTTOM}px)`');
  transition: border 0.25s;
  &:hover {
    border: 1px solid #000000;
  }
  &.cm-focused {
    outline: none;
    border: 1px solid rgba(var(--v-theme-primary)) !important;
    transition: none;
    .cm-cursor {
      border-left-color: rgba(var(--v-theme-text));
    }
  }
  .cm-content {
    padding-top: v-bind('`${PADDING_TOP}px`');
    padding-bottom: 4px;
  }
  .cm-foldGutter span {
    color: revert;
  }
  .cm-activeLine {
    background-color: v-bind('props.readonly ? "" : "rgba(var(--v-theme-primary), 0.2)"');
  }
  .cm-activeLineGutter {
    background-color: v-bind('props.readonly ? "" : "rgba(var(--v-theme-primary), 0.3)"');
  }
  .cm-matchingBracket {
    background-color: rgba(var(--v-theme-primary), 0.3);
  }
  .cm-tooltip-lint {
    background-color: rgba(var(--v-theme-backgroundScale1));
  }
  .cm-lintPoint {
    &:after {
      border-bottom: 8px solid rgba(var(--v-theme-critical));
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      bottom: -4px;
      display: v-bind('model ? "block" : "none"');
    }
  }
  .cm-diagnostic-error {
    border-left: 4px solid rgba(var(--v-theme-critical));
  }
  .cm-selectionBackground {
    background-color: rgba(var(--v-theme-primary), 0.3) !important;
  }
  @at-root .v-theme--dark & {
    &:hover {
      border: 1px solid #ffffff;
    }
  }
}

.v-input--error {
  :deep(.cm-editor) {
    border: 1px solid rgba(var(--v-theme-error)) !important;
  }
}

.editor-wrapper {
  .append-icon {
    position: absolute;
    top: 16px;
    right: 12px;
    opacity: var(--v-medium-emphasis-opacity);
  }
  &.editor-disabled {
    opacity: 0.6;
  }
  &.editor-loading {
    opacity: 0.8;
  }
}
:deep(.cm-line.highlighted-block) {
  background-color: rgba(var(--v-theme-primary), 0.2);
}

:deep(.v-card-text) {
  overflow-y: hidden !important;
  .cm-editor {
    height: calc(100dvh - 60px - 60px - 40px); // 100dvh - dialog margin - card header - padding
  }
}

:deep(.cm-content .editor-var--valid) {
  color: rgb(var(--v-theme-ready)) !important;
}

:deep(.cm-content .editor-var--valid span) {
  color: inherit !important;
}

:deep(.cm-content .editor-var--invalid) {
  color: rgb(var(--v-theme-error)) !important;
}

:deep(.cm-content .editor-var--invalid span) {
  color: inherit !important;
}

:deep(.v-overlay__scrim) {
  border-radius: 4px;
  opacity: 0.18;
}

:deep(.v-overlay__content) {
  display: flex;
  flex-direction: column;
}
</style>

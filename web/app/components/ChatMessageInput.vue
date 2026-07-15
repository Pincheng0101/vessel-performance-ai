<script setup>
import * as SnackbarConstant from '~/constants/SnackbarConstant';
import { TextContentBlock } from '~/models/server/contentBlock';

const props = defineProps({
  placeholder: {
    type: String,
    default: '',
  },
  initialText: {
    type: String,
    default: '',
  },
  onInput: {
    type: Function,
    default: () => {},
  },
  onSend: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
  hideUploadButton: {
    type: Boolean,
    default: false,
  },
  enableServerFileParsing: {
    type: Boolean,
    default: true,
  },
});

const { isMobile } = useDevice();
const display = useDisplay();
const { t } = useI18n();
const snackbarStore = useSnackbarStore();

const model = defineModel({
  type: String,
  default: '',
});

const sending = defineModel('sending', {
  type: Boolean,
  default: false,
});

if (props.initialText) {
  model.value = props.initialText;
}

const inputRef = ref(null);
const fileInputRef = ref(null);
const dropZoneRef = ref(null);

const state = reactive({
  isProcessingAttachments: false,
  isAttachmentPreviewOpen: false,
  selectedPreviewAttachment: null,
  isImeComposing: false,
});

const {
  attachmentType,
  attachments,
  appendFiles,
  removeAttachment,
  restoreAttachments,
  revokePreviewUrls,
  supportedMimeTypes,
  removeAttachmentsFromInput,
  toContentBlocks,
} = useAgentAttachment({
  enableServerFileParsing: props.enableServerFileParsing,
});

const removeSelectedAttachment = (key) => {
  removeAttachment(key);
  if (state.selectedPreviewAttachment?.key === key) {
    state.isAttachmentPreviewOpen = false;
    state.selectedPreviewAttachment = null;
  }
  props.onInput(model.value);
};

const appendSelectedFiles = (files) => {
  const { unsupportedCount = 0 } = appendFiles(files);
  if (unsupportedCount > 0) {
    snackbarStore.setMessage({
      text: t('__messageUnsupportedFilesSkipped', unsupportedCount, { count: numUtils.format(unsupportedCount) }),
      type: SnackbarConstant.Type.WARNING,
    });
  }
  props.onInput(model.value);
};

const handleFileSelection = (event) => {
  appendSelectedFiles(Array.from(event.target.files || []));
  event.target.value = '';
};

const handleDrop = async (_, event) => {
  const files = await fileUtils.extractFilesFromDataTransferItems(event.dataTransfer.items);
  appendSelectedFiles(files);
};

const openAttachmentPreview = (item) => {
  if (state.isProcessingAttachments) return;
  if (item.type !== attachmentType.IMAGE) return;
  state.selectedPreviewAttachment = item;
  state.isAttachmentPreviewOpen = true;
};

const closeAttachmentPreview = () => {
  state.isAttachmentPreviewOpen = false;
  state.selectedPreviewAttachment = null;
};

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
});

const hasContent = computed(() => model.value.trim().length > 0 || attachments.value.length > 0);

const send = async (text) => {
  text = text.trim();
  if (sending.value || (!text && attachments.value.length < 1)) return;
  sending.value = true;

  const textToSend = model.value;
  const attachmentsToSend = [...attachments.value];
  let shouldRestoreAttachments = false;
  state.isAttachmentPreviewOpen = false;
  state.selectedPreviewAttachment = null;
  model.value = '';
  props.onInput('');

  try {
    const contentBlocks = [];
    if (text) {
      contentBlocks.push(new TextContentBlock({ text }));
    }
    state.isProcessingAttachments = attachmentsToSend.length > 0;
    const attachmentContentBlocks = await toContentBlocks(attachmentsToSend);
    state.isProcessingAttachments = false;
    contentBlocks.push(...attachmentContentBlocks);
    removeAttachmentsFromInput();
    shouldRestoreAttachments = true;
    // `onSend` returns truthy only for synchronous flows; streaming senders
    // return falsy and let the upstream `sending` model flip back when the
    // stream ends, so the stop button stays visible.
    const ok = await props.onSend(contentBlocks);
    revokePreviewUrls(attachmentsToSend);
    if (ok) {
      sending.value = false;
    }
  } catch (error) {
    console.error(error);
    model.value = textToSend;
    if (shouldRestoreAttachments) {
      restoreAttachments(attachmentsToSend);
    }
    props.onInput(model.value);
    state.isProcessingAttachments = false;
    sending.value = false;
  }
};

const submit = async (event) => {
  if (event.isComposing) return;
  if ((isMobile || event.shiftKey) && event.key === 'Enter') return;
  // Prevent new line
  event.preventDefault();
  await send(event.target.value);
};

const handleCompositionStart = () => {
  state.isImeComposing = true;
};

const handleCompositionEnd = () => {
  state.isImeComposing = false;
  props.onInput(model.value);
};

const handleInput = () => {
  if (state.isImeComposing) return;
  props.onInput(model.value);
};

const handleSendOrCancel = () => {
  if (state.isProcessingAttachments) return;
  if (sending.value) {
    props.onCancel();
    sending.value = false;
    return;
  }
  send(model.value);
};

const focus = () => {
  inputRef.value.focus();
};

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

defineExpose({
  focus,
  triggerFileUpload,
});
</script>

<template>
  <div
    ref="dropZoneRef"
    class="message-input position-relative"
  >
    <div
      v-if="isOverDropZone"
      class="drop-overlay position-fixed d-flex align-center justify-center"
      aria-hidden="true"
    >
      <div class="d-flex align-center justify-center flex-column ga-3 text-center">
        <v-icon
          icon="mdi-upload"
          size="56"
          color="primary"
        />
        <p class="text-h5 font-weight-bold">
          {{ $t('__titleModifyItem', { action: $t('__actionUpload'), item: $t('__fieldFile', 2) }) }}
        </p>
        <p class="text-body-1">
          {{ $t('__instructionDragFileHere', { type: $t('__fieldFile').toLowerCase() }) }}
        </p>
      </div>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      class="d-none"
      :accept="supportedMimeTypes.join(',')"
      multiple
      @change="handleFileSelection"
    >
    <AppTextarea
      ref="inputRef"
      v-model="model"
      :autofocus="!display.mobile.value"
      :max-rows="8"
      :placeholder="props.placeholder"
      :rows="1"
      auto-grow
      density="default"
      hide-details
      no-resize
      variant="plain"
      @input="handleInput"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @keydown.enter="submit"
    >
      <template
        v-if="$slots.prepend"
        #prepend
      >
        <slot name="prepend" />
      </template>
      <template
        v-if="$slots['append-inner']"
        #append-inner
      >
        <slot name="append-inner" />
      </template>
    </AppTextarea>
    <div
      v-if="attachments.length > 0"
      class="attachment-preview-list d-flex flex-nowrap ga-2 px-1 pt-2"
    >
      <v-sheet
        v-for="item in attachments"
        :key="item.key"
        color="transparent"
        rounded="lg"
        class="attachment-preview-item position-relative overflow-hidden"
        :class="{ 'cursor-pointer': item.type === attachmentType.IMAGE && !state.isProcessingAttachments }"
        @click="openAttachmentPreview(item)"
        @keydown.enter.prevent="openAttachmentPreview(item)"
        @keydown.space.prevent="openAttachmentPreview(item)"
      >
        <template v-if="item.type === attachmentType.IMAGE">
          <v-img
            :src="item.previewUrl"
            cover
            class="preview-image rounded-lg"
          />
        </template>
        <template v-else-if="item.type === attachmentType.FILE">
          <div class="preview-surface preview-file d-flex align-center ga-2 pa-2 rounded-lg h-100">
            <v-sheet
              :height="48"
              :width="48"
              rounded="lg"
              color="primary"
              class="d-flex align-center justify-center flex-shrink-0"
            >
              <v-icon
                :icon="item.icon"
                color="on-primary"
                size="22"
              />
            </v-sheet>
            <div class="overflow-hidden pr-6">
              <p class="text-body-2 font-weight-bold text-truncate">
                {{ item.name }}
              </p>
              <p class="text-caption text-medium-emphasis text-truncate">
                {{ item.typeLabel || $t('__fieldFile') }}
              </p>
            </div>
          </div>
        </template>
        <AppIconButton
          icon="mdi-close"
          :size="state.isProcessingAttachments ? 16 : 24"
          :icon-size="18"
          class="preview-remove position-absolute"
          :tooltip="$t('__actionRemove')"
          variant="text"
          :disabled="state.isProcessingAttachments"
          :loading="state.isProcessingAttachments"
          @click.stop="removeSelectedAttachment(item.key)"
        />
      </v-sheet>
    </div>
    <div class="d-flex pt-3">
      <div class="flex-grow-1">
        <slot name="input-bottom" />
      </div>
      <div class="d-flex ga-1">
        <AppIconButton
          v-if="!props.hideUploadButton"
          icon="mdi-paperclip"
          variant="text"
          :disabled="sending"
          :tooltip="$t('__tooltipUploadFilesOrImages')"
          @click.stop="fileInputRef?.click()"
        />
        <ChatSpeechRecognition
          v-slot="{ isListening, isSupported, start, stop }"
          :on-record="(texts) => {
            model = texts.join(' ').trim();
            props.onInput(model);
          }"
        >
          <template v-if="isSupported && (isListening || (!hasContent && !sending))">
            <AppIconButton
              :icon="isListening ? 'mdi-microphone-off' : 'mdi-microphone'"
              :tooltip="isListening ? $t('__actionDictateStop') : $t('__actionDictateStart')"
              variant="text"
              @click.stop="() => {
                isListening ? stop() : start();
              }"
            />
          </template>
          <template v-else-if="hasContent || sending">
            <AppIconButton
              :icon="state.isProcessingAttachments ? 'mdi-send' : (sending ? 'mdi-stop-circle' : 'mdi-send')"
              :disabled="state.isProcessingAttachments"
              :tooltip="state.isProcessingAttachments ? $t('__fieldStatusProcessing') : (sending ? $t('__actionStop') : $t('__actionSendMessage'))"
              variant="text"
              @click.stop="handleSendOrCancel"
            />
          </template>
        </ChatSpeechRecognition>
      </div>
    </div>
    <AppImagePreviewDialog
      v-model="state.isAttachmentPreviewOpen"
      :src="state.selectedPreviewAttachment?.previewUrl"
      @update:model-value="(value) => {
        if (!value) closeAttachmentPreview();
      }"
    />
  </div>
</template>

<style lang="scss" scoped>
.message-input {
  border-radius: 18px;
  transition: background-color 0.2s ease, outline-color 0.2s ease;
}
.drop-overlay {
  left: var(--v-layout-left, 0px);
  right: var(--v-layout-right, 0px);
  top: var(--v-layout-top, 0px);
  bottom: var(--v-layout-bottom, 0px);
  z-index: 1;
  background-color: rgba(var(--v-theme-background), 0.78);
  backdrop-filter: blur(6px);
}
.preview-surface {
  background-color: rgba(var(--v-theme-backgroundScale2));
}
.attachment-preview-list {
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.attachment-preview-item {
  flex: 0 0 auto;
}
.preview-image {
  width: 68px;
  height: 68px;
  background-color: rgba(var(--v-theme-background));
  border: 1px solid rgba(var(--v-theme-backgroundScale4), 0.4);
}
.preview-remove {
  right: 8px;
  top: 8px;
  background-color: rgba(var(--v-theme-background), 0.8);
}
.preview-file {
  width: 280px;
  border: 1px solid rgba(var(--v-theme-backgroundScale4), 0.4);
}
:deep(.v-field) {
  background-color: rgba(var(--v-theme-backgroundScale2));
}
:deep(.v-chip) {
  height: 32px;
}
:deep(.v-input__prepend) {
  padding-top: 16px !important;
}
</style>

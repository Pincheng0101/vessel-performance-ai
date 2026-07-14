<script setup>
import { SnackbarConstant, StorageConstant } from '~/constants';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  bordered: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  hint: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();

const fileInput = ref(null);

const state = reactive({
  files: [],
  refresh: 0,
  isFolderPickerOpen: false,
});

const normalizedSupportedExtensions = computed(() => (
  props.supportedExtensions.map(item => item.toLowerCase())
));

const openFilePicker = async () => {
  state.isFolderPickerOpen = false;
  await nextTick();
  fileInput.value.click();
};

const openFolderPicker = async () => {
  state.isFolderPickerOpen = true;
  await nextTick();
  fileInput.value.click();
};

const normalizeFileName = (name) => {
  // Pattern is built from the hardcoded StorageConstant.INVALID_SYMBOLS constant, not user input. False positive — flagged only because the RegExp argument is non-literal.
  // nosemgrep: eslint.detect-non-literal-regexp
  const invalidChars = new RegExp(`[${StorageConstant.INVALID_SYMBOLS.join('')}]`, 'g');
  return name.replace(invalidChars, '_');
};

const isSupportedFile = (file) => {
  if (!normalizedSupportedExtensions.value.length) return true;
  const extension = pathUtils.getFileExtension(file.name);
  if (!extension) return false;
  return normalizedSupportedExtensions.value.includes(extension);
};

const notifyUnsupportedFilesSkipped = (count) => {
  if (count <= 0) return;
  snackbarStore.setMessage({
    text: t('__messageUnsupportedFilesSkipped', count, { count: numUtils.format(count) }),
    type: SnackbarConstant.Type.WARNING,
  });
};

const addFiles = (files = [], options = {}) => {
  if (!files.length) return;

  const normalizedFiles = files
    .map(item => fileUtils.rename(item, normalizeFileName(item.name)));
  const supportedFiles = normalizedFiles.filter(file => isSupportedFile(file));
  const unsupportedCount = normalizedFiles.length - supportedFiles.length;
  const isFolderSelection = options.isFolderPickerOpen
    ?? normalizedFiles.some(file => (file.webkitRelativePath || '').includes('/'));

  if (isFolderSelection) {
    notifyUnsupportedFilesSkipped(unsupportedCount);
  }

  const targetModel = model.value;
  const dedupedFiles = supportedFiles.filter(file => !targetModel.some(item =>
    options.isFolderPickerOpen
      ? item.webkitRelativePath === file.webkitRelativePath
      : item.name === file.name,
  ));

  model.value = [...targetModel, ...dedupedFiles];
};

defineExpose({
  addFiles,
  openFilePicker,
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldName'), key: 'name' },
      { title: $t('__fieldFolder'), key: 'webkitRelativePath', value: (item) => item.webkitRelativePath ? pathUtils.extractDirectory(item.webkitRelativePath, '/') : '' },
      { title: $t('__fieldSize'), key: 'size', value: (item) => fileUtils.formatBytes(item.size) },
      { title: $t('__fieldType'), key: 'type', value: (item) => fileUtils.getFileType(item) },
    ]"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :server-side="false"
    :bordered="props.bordered"
    draggable
    enable-scroll-button
    hide-no-data
    @update:model-value="() => {
      state.refresh += 1;
    }"
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog :on-submit="onItemUpdate">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            :disabled="props.loading"
            :on-click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <slot
            name="edit-form"
            :item="item"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :disabled="props.loading"
        @click="onItemRemove"
      />
    </template>
    <template #bottom>
      <div class="d-flex justify-center">
        <AppButton
          :text="$t('__titleModifyItem', { action: t('__actionUpload'), item: t('__fieldFile', 2) })"
          color="primary"
          width="170"
          variant="outlined"
          prepend-icon="mdi-file-document-plus"
          :disabled="props.loading"
          class="mr-2"
          @click="openFilePicker"
        />
        <AppButton
          :text="$t('__titleModifyItem', { action: t('__actionUpload'), item: t('__fieldFolder', 2) })"
          color="primary"
          width="170"
          variant="outlined"
          prepend-icon="mdi-folder-plus"
          :disabled="props.loading"
          @click="openFolderPicker"
        />
        <AppFileInput
          :key="state.refresh"
          ref="fileInput"
          v-model="state.files"
          multiple
          :supported-extensions="props.supportedExtensions"
          :webkitdirectory="state.isFolderPickerOpen"
          class="d-none"
          @update:model-value="(v) => {
            addFiles(v, { isFolderPickerOpen: state.isFolderPickerOpen });
          }"
        />
      </div>
    </template>
  </AppTable>
</template>

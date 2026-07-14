<script setup>
const props = defineProps({
  defaultValue: {
    type: [File, String, Array],
    default: null,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  webkitdirectory: {
    type: Boolean,
    default: false,
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  rules: {
    type: Array,
    default: () => [],
  },
  onClear: {
    type: Function,
    default: () => {},
  },
});

const inputRef = ref(null);

const model = defineModel({
  type: [File, Array],
  default: null,
});

const encoded = defineModel('encoded', {
  type: [String, Array],
  default: null,
});

const initializeStates = () => {
  if (props.defaultValue) {
    encoded.value = props.defaultValue;
  }
  if (encoded.value) {
    const processFile = async (file) => {
      const isFileType = file instanceof File;
      const modelValue = isFileType ? file : fileUtils.createFromBase64(file);
      const encodedValue = isFileType ? await fileUtils.toBase64(file) : file;
      return { modelValue, encodedValue };
    };

    (async () => {
      if (Array.isArray(encoded.value)) {
        const results = await Promise.all(encoded.value.map(processFile));
        model.value = results.map(result => result.modelValue);
        encoded.value = results.map(result => result.encodedValue);
        return;
      }
      const { modelValue, encodedValue } = await processFile(encoded.value);
      model.value = modelValue;
      encoded.value = encodedValue;
    })();
  }
};

const handleClose = (index) => {
  model.value = model.value.filter((_, i) => i !== index);
};

const toggleDirectorySelection = () => {
  if (!inputRef.value) return;
  const input = inputRef.value.$el.querySelector('input[type="file"]');
  if (!input) return;
  if (props.webkitdirectory) {
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    return;
  }
  input.removeAttribute('webkitdirectory');
  input.removeAttribute('directory');
};

watch(model, async (after) => {
  if (after) {
    if (Array.isArray(after)) {
      encoded.value = await Promise.all(after.map(fileUtils.toBase64));
      return;
    }
    encoded.value = await fileUtils.toBase64(after);
    return;
  }
  encoded.value = '';
});

watch(() => props.webkitdirectory, () => {
  toggleDirectorySelection();
});

onMounted(() => {
  initializeStates();
  toggleDirectorySelection();
});

defineExpose({
  click: () => {
    inputRef.value.$el.querySelector('input[type="file"]').click();
  },
});
</script>

<template>
  <v-file-input
    ref="inputRef"
    v-model="model"
    :accept="props.supportedExtensions.length > 0 ? props.supportedExtensions.join(',') : ''"
    :chips="props.multiple"
    :hint="props.supportedExtensions.length > 0 ? $t('__instructionSupportedFileTypes', { types: props.supportedExtensions.map(item => item.replace('/*', '/\\*')).join(', ') }) : ''"
    :multiple="props.multiple"
    color="primary"
    counter
    density="compact"
    persistent-hint
    prepend-icon=""
    prepend-inner-icon="mdi-paperclip"
    show-size
    variant="outlined"
    :rules="props.rules"
    @click:clear="props.onClear"
  >
    <template
      v-if="props.multiple"
      #selection="{ fileNames }"
    >
      <template
        v-for="(fileName, i) in fileNames"
        :key="fileName"
      >
        <v-chip
          color="primary"
          size="small"
          class="mr-2"
          closable
          @click="() => {}"
          @click:close="handleClose(i)"
        >
          {{ fileName }}
        </v-chip>
      </template>
    </template>
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
  </v-file-input>
</template>

<style lang="scss" scoped>
:deep() {
  .v-field__input {
    cursor: pointer;
    z-index: 1;
  }
  .v-chip {
    cursor: text;
    user-select: none;
    .v-chip__content {
      display: inline-block;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
  }
}
</style>

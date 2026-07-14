<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  rules: {
    type: Array,
    default: () => [],
  },
  preview: {
    type: Boolean,
    default: true,
  },
});

const model = defineModel({
  type: File,
  default: null,
});

const inputRef = ref(null);

const state = reactive({
  previewUrl: null,
});

const IMAGE_TYPE_PREFIX = 'image/';

const handleFilesDrop = (files) => {
  const [file] = files;
  if (file && file.type.startsWith(IMAGE_TYPE_PREFIX)) {
    model.value = file;
  }
};

const updatePreviewUrl = (file) => {
  if (file && file instanceof File && file.type.startsWith(IMAGE_TYPE_PREFIX)) {
    state.previewUrl = URL.createObjectURL(file);
    return;
  }
  state.previewUrl = null;
};

const enablePreview = computed(() => {
  return props.preview && model.value && model.value.type.startsWith(IMAGE_TYPE_PREFIX);
});

watch(() => model.value, (after) => {
  updatePreviewUrl(after);
}, { immediate: true });

onBeforeUnmount(() => {
  if (model.value) {
    URL.revokeObjectURL(state.previewUrl);
  }
});
</script>

<template>
  <AppFileInput
    :id="props.id"
    ref="inputRef"
    v-model="model"
    :supported-extensions="props.supportedExtensions"
    :rules="props.rules"
  />
  <AppUploadDropZone
    :disabled="props.loading"
    :text="$t('__instructionDragFileHere', { type: $t('__fieldImage').toLowerCase() })"
    :enable-preview="enablePreview"
    :preview-url="state.previewUrl"
    :data-types="props.supportedExtensions.map(ext => `${IMAGE_TYPE_PREFIX}${ext.slice(1)}`)"
    :on-click="() => inputRef.click()"
    :on-drop="handleFilesDrop"
  />
</template>

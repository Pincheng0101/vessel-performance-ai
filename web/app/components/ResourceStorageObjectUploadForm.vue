<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  storageObjects: {
    type: Array,
    default: null,
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const formRef = ref(null);
const uploadTableRef = ref(null);

const state = reactive({
  files: [],
  isLoading: false,
});

const handleFilesDrop = (files) => {
  if (!files || files.length === 0) return;
  uploadTableRef.value.addFiles(files);
};

const submit = async () => {
  state.isLoading = true;
  // Ensure the DOM update has finished before proceeding
  await delay(100);
  const uploadFormElement = formRef.value.$el.querySelector('.v-card-text');
  scrollUtils.scrollTo({ top: uploadFormElement.scrollHeight, target: uploadFormElement });
  await props.onSubmit(state.files);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    ref="formRef"
    :form-title="$t('__titleModifyItem', { action: $t('__actionUpload'), item: $t('__fieldFile', 2) })"
    :on-submit="submit"
    :on-discard="props.onDiscard"
    :submit-button-text="$t('__actionUpload')"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldFile', 2)"
        required
      >
        <AppUploadDropZone
          :disabled="props.loading"
          :on-drop="handleFilesDrop"
          :on-click="() => {
            uploadTableRef.openFilePicker();
          }"
        />
        <ResourceStorageObjectUploadTable
          :id="id"
          ref="uploadTableRef"
          v-model="state.files"
          :loading="props.loading"
          :progress="props.progress"
          :storage-objects="props.storageObjects"
          :supported-extensions="props.supportedExtensions"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
        <template v-if="state.isLoading">
          <AppProgressLinear
            :progress="props.progress"
            show-elapsed-time
          />
        </template>
      </AppInputGroup>
    </template>
  </AppForm>
</template>

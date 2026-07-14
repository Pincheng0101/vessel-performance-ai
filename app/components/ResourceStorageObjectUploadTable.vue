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
});

const fileTableRef = ref(null);

const model = defineModel({
  type: Array,
  default: [],
});

defineExpose({
  addFiles: files => fileTableRef.value.addFiles(files),
  openFilePicker: () => fileTableRef.value.openFilePicker(),
});
</script>

<template>
  <AppFileTable
    ref="fileTableRef"
    v-model="model"
    :loading="props.loading"
    :supported-extensions="props.supportedExtensions"
  >
    <template #edit-form="{ item, onSubmit, onDiscard }">
      <ResourceStorageObjectEditForm
        :form-data="item"
        :used-names="props.storageObjects?.filter(v => v.objectPath).map(v => v.name)"
        :on-submit="(formData) => onSubmit(fileUtils.rename(item, formData.name))"
        :on-discard="onDiscard"
      />
    </template>
  </AppFileTable>
</template>

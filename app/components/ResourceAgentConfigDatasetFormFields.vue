<script setup>
import { LoaderConstant } from '~/constants';

const formData = defineModel('formData', {
  type: Object,
  required: true,
});

const fileTableRef = ref(null);

const handleFilesDrop = (files) => {
  if (!files || files.length === 0) return;
  fileTableRef.value.addFiles(files);
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldDatasetUpload')"
    required
  >
    <AppUploadDropZone
      :on-drop="handleFilesDrop"
      :on-click="() => {
        fileTableRef.openFilePicker();
      }"
      class="mb-4"
    />
    <AppFileTable
      :id="id"
      ref="fileTableRef"
      v-model="formData.files"
      :supported-extensions="LoaderConstant.Type.UNSUPERVISED.supportedFileExtensions"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    >
      <template #edit-form="{ item, onSubmit, onDiscard }">
        <ResourceStorageObjectEditForm
          :form-data="item"
          :on-submit="(data) => onSubmit(fileUtils.rename(item, data.name))"
          :on-discard="onDiscard"
        />
      </template>
    </AppFileTable>
  </AppInputGroup>
</template>

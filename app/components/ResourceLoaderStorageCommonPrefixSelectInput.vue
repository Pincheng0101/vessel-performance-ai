<script setup>
import { Storage } from '~/models/server/storage';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: String,
  default: '',
});

const storageResource = defineModel('storageResource', {
  type: Storage,
  default: null,
});

const submit = (selectedFolder) => {
  model.value = selectedFolder;
};
</script>

<template>
  <AppInputGroup
    :label="$t('__fieldFolder')"
    :tooltip="$t('__tooltipStorageFolder')"
  >
    <template #default="{ id }">
      <AppDialog
        :on-submit="submit"
        :width="1000"
      >
        <template #activator="{ onOpen }">
          <AppTextField
            :id="id"
            v-model="model"
            :disabled="props.disabled"
            append-inner-icon="mdi-pencil"
            clearable
            readonly
            class="clickable"
            @click:control="onOpen"
            @click:append-inner="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceStorageCommonPrefixSelectList
            :common-prefix="pathUtils.removeLastSegment(model)"
            :selected-id="model"
            :storage="storageResource"
            :submit-button-text="$t('__actionSave')"
            :title="$t('__titleSelectFolder')"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppInputGroup>
</template>

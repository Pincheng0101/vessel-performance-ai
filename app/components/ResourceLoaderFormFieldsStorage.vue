<script setup>
import { Storage } from '~/models/server/storage';

const props = defineProps({
  fileExtensionItems: {
    type: Array,
    default: () => [],
  },
});

const commonPrefix = defineModel('commonPrefix', {
  type: String,
  default: null,
});

const fileExtensions = defineModel('fileExtensions', {
  type: Array,
  default: null,
});

const storageId = defineModel('storageId', {
  type: String,
  default: null,
});

const state = reactive({
  /**
   * @type {{ storage: Storage }}
   */
  storageResource: null,
});

const restoreStorage = () => {
  if (storageId.value) {
    state.storageResource = new Storage({ storageId: storageId.value });
  }
};

restoreStorage();
</script>

<template>
  <ResourceStoragePaginatedSelect
    v-model="storageId"
    v-model:restored-objects="state.storageResource"
    :return-object="false"
    required
    @update:model-value="() => {
      commonPrefix = null
    }"
  />
  <ResourceLoaderStorageCommonPrefixSelectInput
    v-model="commonPrefix"
    v-model:storage-resource="state.storageResource"
    :disabled="!storageId"
  />
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldFileExtension', 2)"
  >
    <AppAutocomplete
      :id="id"
      v-model="fileExtensions"
      :items="props.fileExtensionItems"
      chips
      multiple
    />
  </AppInputGroup>
</template>

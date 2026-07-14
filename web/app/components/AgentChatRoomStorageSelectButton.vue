<script setup>
import { ResourceConstant, StorageConstant } from '~/constants';
import ResourceStorageForm from './ResourceStorageForm';

const props = defineProps({
  hideActivator: {
    type: Boolean,
    default: false,
  },
});

const storageId = defineModel('storageId', {
  type: String,
  default: null,
});

const server = useServer();

const state = reactive({
  currentStorage: null,
  isOpen: false,
});

const fetchCurrentStorage = async () => {
  if (!storageId.value) {
    state.currentStorage = null;
    return;
  }
  const { data } = await server.storage.get({ storageId: storageId.value }, { lazy: false });
  state.currentStorage = data.value || null;
};

const openDialog = () => {
  state.isOpen = true;
};

const handleSubmit = (selected) => {
  const next = Array.isArray(selected) ? selected[0] : selected;
  storageId.value = next?.id ?? null;
};

const handleClear = () => {
  storageId.value = null;
};

watch(() => storageId.value, fetchCurrentStorage, { immediate: true });

defineExpose({ open: openDialog });
</script>

<template>
  <AppDialog
    v-model="state.isOpen"
    :width="1000"
    :persistent="false"
    :on-submit="handleSubmit"
  >
    <template
      v-if="!props.hideActivator"
      #activator="{ onOpen }"
    >
      <v-chip
        class="bg-background"
        color="primaryLight"
        variant="text"
        @click="onOpen"
      >
        <div class="d-flex ga-1 align-center">
          <AppImageIcon
            :src="StorageConstant.Type.STORAGE.iconPath"
            width="16"
            height="16"
          />
          {{ state.currentStorage?.name ?? $t('__actionSelectStorage') }}
          <v-icon
            v-if="state.currentStorage"
            icon="mdi-close-circle"
            size="small"
            class="ml-1"
            @click.stop="handleClear"
          />
        </div>
      </v-chip>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <ResourcePaginatedSelectTable
        :field-name="$t('__fieldStorage')"
        :instruction="$t('__instructionResourceStorage')"
        :module="ResourceConstant.Type.STORAGE.module"
        :form-component="ResourceStorageForm"
        :title="$t('__fieldStorage', 2)"
        :headers="[
          { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'storage_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.id), target: '_blank' }) },
          { title: $t('__fieldStatus'), key: 'status', isStatus: true },
          { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
        ]"
        :selected-id="storageId"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

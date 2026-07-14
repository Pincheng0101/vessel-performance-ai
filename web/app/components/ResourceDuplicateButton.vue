<script setup>
const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  item: {
    type: Object,
    default: null,
  },
  module: {
    type: String,
    default: null,
  },
  itemLabel: {
    type: String,
    required: true,
  },
  onDuplicate: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  formData: {
    name: '',
  },
});

watch(() => props.item, (after) => {
  if (after) {
    state.formData.name = after.name;
  }
}, { deep: true });

const duplicateItem = async (item) => {
  await props.onDuplicate(item);
};
</script>

<template>
  <AppDialog :on-submit="duplicateItem">
    <template #activator="{ onOpen }">
      <AppIconButton
        :aria-label="props.ariaLabel"
        :disabled="!props.item"
        :tooltip="$t('__actionDuplicate')"
        icon="mdi-content-duplicate"
        variant="text"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <ResourceDuplicateForm
        :item="props.item"
        :item-label="props.itemLabel"
        :module="props.module"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

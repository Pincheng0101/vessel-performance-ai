<script setup>
const props = defineProps({
  actionLabel: {
    type: String,
    default: null,
  },
  instruction: {
    type: String,
    default: null,
  },
  item: {
    type: Object,
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
  itemLabel: {
    type: String,
    required: true,
  },
  onDelete: {
    type: Function,
    required: true,
  },
  allowDeleteRecursively: {
    type: Boolean,
    default: false,
  },
});

const deleteRecursively = defineModel('deleteRecursively', {
  type: Boolean,
  default: false,
});

const deleteItem = async () => {
  await props.onDelete(props.item);
};
</script>

<template>
  <AppDialog
    :on-submit="deleteItem"
    :width="props.allowDeleteRecursively ? 1000 : undefined"
  >
    <template #activator="{ onOpen }">
      <AppIconButton
        :aria-label="props.actionLabel || $t('__actionDelete')"
        :disabled="!props.item && props.items?.length < 1"
        :tooltip="$t('__actionDelete')"
        icon="mdi-trash-can"
        variant="text"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel, loading }">
      <ResourceDeleteConfirmationCard
        v-model:delete-recursively="deleteRecursively"
        :item="props.item"
        :items="props.items"
        :item-label="props.itemLabel"
        :allow-delete-recursively="props.allowDeleteRecursively"
        :loading="loading"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

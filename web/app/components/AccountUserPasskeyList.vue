<script setup>
const props = defineProps({
  passkeys: {
    type: Array,
    default: () => [],
  },
  onDelete: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const headers = computed(() => [
  { title: t('__fieldName'), key: 'name' },
  { title: t('__fieldType'), key: 'authenticatorAttachment' },
  { title: t('__fieldCreated'), key: 'createdAt', isTimestamp: true },
]);

const items = computed(() => props.passkeys.map(p => ({
  ...p,
  id: p.credentialId,
  name: p.friendlyName || `${p.credentialId.slice(0, 24)}…`,
})));
</script>

<template>
  <AppTable
    :title="$t('__titleRegisteredPasskeys')"
    icon="mdi-fingerprint"
    :server-side="false"
    :headers="headers"
    :items="items"
    :enable-search="false"
    :show-pagination="false"
  >
    <template #row-menu="{ item }">
      <AppDialog :on-submit="() => props.onDelete(item.credentialId)">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-trash-can"
            variant="text"
            :aria-label="$t('__actionDelete')"
            :tooltip="$t('__actionDelete')"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceDeleteConfirmationCard
            :item="item"
            :item-label="$t('__fieldMfaPasskey')"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppTable>
</template>

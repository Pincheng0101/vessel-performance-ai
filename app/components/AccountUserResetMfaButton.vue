<script setup>
const props = defineProps({
  resource: {
    type: Object,
    required: true,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();
const server = useServer();

const submit = async () => {
  const { error } = await server.user.adminResetUserMfa({ userName: props.resource.userName });
  if (error.value) {
    snackbarStore.setActionFailure('__actionResetUserMfa');
    return;
  }
  await props.onSubmit();
  snackbarStore.setSuccess(t('__messageUserMfaResetSuccess'));
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <AppIconButton
        icon="mdi-shield-key-outline"
        variant="text"
        :aria-label="$t('__actionResetUserMfa')"
        :tooltip="$t('__actionResetUserMfa')"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel, loading }">
      <AccountUserActionConfirmationCard
        :action-label="$t('__actionResetUserMfa')"
        instruction-keypath="__instructionResetUserMfa"
        :name="props.resource.name"
        :loading="loading"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

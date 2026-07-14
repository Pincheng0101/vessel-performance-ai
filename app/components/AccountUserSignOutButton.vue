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
  const { error } = await server.user.adminUserGlobalSignOut({ userName: props.resource.userName });
  if (error.value) {
    snackbarStore.setActionFailure('__actionSignOutUser');
    return;
  }
  await props.onSubmit();
  snackbarStore.setSuccess(t('__messageUserSignOutSuccess'));
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <AppIconButton
        icon="mdi-logout"
        variant="text"
        :aria-label="$t('__actionSignOutUser')"
        :tooltip="$t('__actionSignOutUser')"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel, loading }">
      <AccountUserActionConfirmationCard
        :action-label="$t('__actionSignOutUser')"
        instruction-keypath="__instructionSignOutUser"
        :name="props.resource.name"
        :loading="loading"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

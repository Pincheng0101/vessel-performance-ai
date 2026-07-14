<script setup>
import { AccountConstant } from '~/constants';

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

const snackbarStore = useSnackbarStore();
const server = useServer();

const submit = async (formData) => {
  if (formData.messageAction === AccountConstant.MessageAction.RESEND) {
    const { error } = await server.user.adminCreate({
      ...props.resource,
      messageAction: AccountConstant.MessageAction.RESEND,
      temporaryPassword: formData.temporaryPassword,
    });
    if (error.value) {
      snackbarStore.setActionFailure('__messageTemporaryPasswordReset');
      return;
    }
    await props.onSubmit();
    snackbarStore.setActionSuccess('__messageTemporaryPasswordReset');
    return;
  }
  const { error } = await server.user.adminResetUserPassword({ userName: props.resource.userName, temporaryPassword: formData.temporaryPassword });
  if (error.value) {
    snackbarStore.setActionFailure('__messageTemporaryPasswordReset');
    return;
  }
  await props.onSubmit();
  snackbarStore.setActionSuccess('__messageTemporaryPasswordReset');
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <AppIconButton
        icon="mdi-lock-reset"
        variant="text"
        :tooltip="$t('__actionResetTemporaryPassword')"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <AccountUserTemporaryPasswordForm
        :resource="props.resource"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

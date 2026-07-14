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
const auth = useAuth();
const server = useServer();

const submit = async (formData) => {
  const { error } = await server.me.changePassword({
    oldPassword: formData.oldPassword,
    newPassword: formData.newPassword,
  });
  if (error.value) {
    snackbarStore.setActionFailure('__actionChangePassword');
    return;
  }
  await props.onSubmit();
  snackbarStore.setSuccess($t('__messagePasswordUpdateSuccessfully'));
  auth.signOut();
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <AppIconButton
        :icon="AccountConstant.Base.CHANGE_PASSWORD.icon"
        variant="text"
        :tooltip="$t('__actionChangePassword')"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <AccountUserChangePasswordForm
        :resource="props.resource"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

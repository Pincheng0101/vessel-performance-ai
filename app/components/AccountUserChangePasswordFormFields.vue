<script setup>
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  reenteredNewPassword: '',
  showOldPassword: false,
  showNewPassword: false,
  showReenteredNewPassword: false,
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldCurrentPassword')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.oldPassword"
      :type="state.showOldPassword ? 'text' : 'password'"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .string()
          .stringLengthGte(8)
          .stringNotContains(' ')
          .apply('stringContainsAnyUppercase')
          .apply('stringContainsAnyLowercase')
          .apply('stringContainsAnyNumber')
          .apply('stringContainsAnySymbol')
          .collect()
      )"
    >
      <template #append-inner>
        <AppIconButton
          :icon="state.showOldPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
          icon-size="default"
          variant="text"
          :on-click="() => state.showOldPassword = !state.showOldPassword"
        />
      </template>
    </AppTextField>
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldNewPassword')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.newPassword"
      :type="state.showNewPassword ? 'text' : 'password'"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .string()
          .stringLengthGte(8)
          .stringNotContains(' ')
          .apply('stringContainsAnyUppercase')
          .apply('stringContainsAnyLowercase')
          .apply('stringContainsAnyNumber')
          .apply('stringContainsAnySymbol')
          .collect()
      )"
    >
      <template #append-inner>
        <AppIconButton
          :icon="state.showNewPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
          icon-size="default"
          variant="text"
          :on-click="() => state.showNewPassword = !state.showNewPassword"
        />
      </template>
      <template #append>
        <AppButton
          :text="$t('__actionGenerate')"
          color="primary"
          @click="() => {
            formData.newPassword = strUtils.generatePassword();
          }"
        />
      </template>
    </AppTextField>
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldConfirmNewPassword')"
    required
  >
    <AppTextField
      :id="id"
      v-model="state.reenteredNewPassword"
      :type="state.showReenteredNewPassword ? 'text' : 'password'"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .string()
          .same($t('__fieldNewPassword'), formData.newPassword)
          .collect()
      )"
    >
      <template #append-inner>
        <AppIconButton
          :icon="state.showReenteredNewPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
          icon-size="default"
          variant="text"
          :on-click="() => state.showReenteredNewPassword = !state.showReenteredNewPassword"
        />
      </template>
    </AppTextField>
  </AppInputGroup>
</template>

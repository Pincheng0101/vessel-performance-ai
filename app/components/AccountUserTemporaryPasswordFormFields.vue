<script setup>
import { AccountConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  enableSendTemporaryPasswordEmail: false,
  enableCustomTemporaryPassword: false,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('messageAction')"
    v-slot="{ id }"
    :label="$t('__fieldSendTemporaryPasswordNotificationEmail')"
  >
    <AppSwitch
      :id="id"
      v-model="state.enableSendTemporaryPasswordEmail"
      @update:model-value="(v) => {
        if (!v) {
          formData.messageAction = null;
          state.enableCustomTemporaryPassword = false;
          return;
        }
        formData.messageAction = AccountConstant.MessageAction.RESEND
        state.enableCustomTemporaryPassword = !!formData.temporaryPassword
      }"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="state.enableSendTemporaryPasswordEmail"
    v-slot="{ id }"
    :label="$t('__fieldUseCustomTemporaryPassword')"
    :tooltip="$t('__tooltipAccountCustomTemporaryPassword')"
  >
    <AppSwitch
      :id="id"
      v-model="state.enableCustomTemporaryPassword"
      @update:model-value="(v) => {
        if (!v) {
          formData.temporaryPassword = null;
        }
      }"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!state.enableSendTemporaryPasswordEmail || (state.enableSendTemporaryPasswordEmail && state.enableCustomTemporaryPassword)"
    v-slot="{ id, label }"
    :label="$t(AccountConstant.Base.TEMPORARY_PASSWORD.i18nTitle)"
    required
  >
    <p class="pb-2">
      {{ $t('__instructionUserSaveTemporaryPassword') }}
    </p>
    <AppTextField
      :id="id"
      v-model="formData.temporaryPassword"
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
        <AppCopyable :text="formData.temporaryPassword">
          <template #default="{ copy, tooltip }">
            <AppIconButton
              icon="mdi-content-copy"
              variant="text"
              :tooltip="tooltip"
              :on-click="copy"
            />
          </template>
        </AppCopyable>
      </template>
      <template #append>
        <AppButton
          :text="$t('__actionGenerate')"
          color="primary"
          @click="() => {
            formData.temporaryPassword = strUtils.generatePassword();
          }"
        />
      </template>
    </AppTextField>
  </AppInputGroup>
</template>

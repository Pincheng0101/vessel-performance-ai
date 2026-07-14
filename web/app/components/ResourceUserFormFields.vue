<script setup>
import { AccountConstant } from '~/constants';

/**
 * @import { User } from '~/models/server/user'
 */

/**
 * @type {{ resource: User }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

/**
 * @type {Ref<User>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  enableSendTemporaryPasswordEmail: true,
  enableCustomTemporaryPassword: false,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('userName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.userName"
      :disabled="!!props.resource"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .apply(String(formData.userName).includes('@') ? 'email' : 'alphaDash')
          .stringLengthLte(64)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('email')"
    v-slot="{ id, label }"
    :label="$t('__fieldEmail')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.email"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .email()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('isAdmin')"
    v-slot="{ id }"
    :label="$t('__fieldAdmin')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.isAdmin"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('enabled')"
    v-slot="{ id }"
    :label="$t('__fieldEnabled')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.enabled"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('messageAction')"
    v-slot="{ id }"
    :label="$t('__fieldSendTemporaryPasswordNotificationEmail')"
  >
    <AppSwitch
      :id="id"
      v-model="state.enableSendTemporaryPasswordEmail"
      @update:model-value="(v) => {
        formData.messageAction = v ? null : AccountConstant.MessageAction.SUPPRESS;
      }"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('temporaryPassword')"
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
    v-if="!props.hiddenFields.includes('temporaryPassword') && state.enableCustomTemporaryPassword"
    v-slot="{ id, label }"
    :label="$t('__fieldTemporaryPassword')"
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

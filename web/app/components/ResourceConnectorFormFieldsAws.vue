<script setup>
import { AwsConstant, ConnectorConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const awsAccessKeyId = defineModel('awsAccessKeyId', {
  type: String,
  default: null,
});

const awsSecretAccessKey = defineModel('awsSecretAccessKey', {
  type: String,
  default: null,
});

const accountId = defineModel('accountId', {
  type: String,
  default: null,
});

const credentialType = defineModel('credentialType', {
  type: String,
  default: null,
});

const regionName = defineModel('regionName', {
  type: String,
  default: null,
});

const roleName = defineModel('roleName', {
  type: String,
  default: null,
});

if (awsAccessKeyId.value) {
  credentialType.value = ConnectorConstant.CredentialType.ACCESS_KEY.value;
}

if (accountId.value && roleName.value) {
  credentialType.value = ConnectorConstant.CredentialType.IAM_ROLE.value;
}

const handleCredentialTypeChange = () => {
  awsAccessKeyId.value = null;
  awsSecretAccessKey.value = null;
  accountId.value = null;
  roleName.value = null;
};
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('regionName')"
    v-slot="{ id }"
    :label="$t('__fieldRegion')"
    :tooltip="$t('__tooltipResourceConnectorAwsRegionName')"
  >
    <AppSelect
      :id="id"
      v-model="regionName"
      :items="Object.values(AwsConstant.Region)"
      clearable
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('credentialType')"
    v-slot="{ id, label }"
    :label="$t('__fieldCredentialType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="credentialType"
      :items="Object.values(ConnectorConstant.CredentialType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="handleCredentialTypeChange"
    />
  </AppInputGroup>
  <template v-if="credentialType === ConnectorConstant.CredentialType.ACCESS_KEY.value">
    <AppInputGroup
      v-if="!props.hiddenFields.includes('awsAccessKeyId')"
      v-slot="{ id, label }"
      :label="$t('__fieldAwsAccessKeyId')"
      required
    >
      <AppTextField
        :id="id"
        v-model="awsAccessKeyId"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
    <AppInputGroup
      v-if="!props.hiddenFields.includes('awsSecretAccessKey')"
      v-slot="{ id, label }"
      :label="$t('__fieldAwsSecretAccessKey')"
      required
    >
      <AppSecretInput
        :id="id"
        v-model="awsSecretAccessKey"
        :is-reset-button-visible="!!awsAccessKeyId"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
  </template>
  <template v-else-if="credentialType === ConnectorConstant.CredentialType.IAM_ROLE.value">
    <AppInputGroup
      v-if="!props.hiddenFields.includes('accountId')"
      v-slot="{ id, label }"
      :label="$t('__fieldAccountId')"
      required
    >
      <AppTextField
        :id="id"
        v-model="accountId"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .numeric()
            .stringLength(12)
            .collect()
        )"
      />
    </AppInputGroup>
    <AppInputGroup
      v-if="!props.hiddenFields.includes('roleName')"
      v-slot="{ id, label }"
      :label="$t('__fieldRoleName')"
      required
    >
      <AppTextField
        :id="id"
        v-model="roleName"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
  </template>
</template>

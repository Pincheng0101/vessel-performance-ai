<script setup>
import { ConnectorConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  fileExtensionItems: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const connectorId = defineModel('connectorId', {
  type: String,
  default: null,
});

const s3Bucket = defineModel('s3Bucket', {
  type: String,
  default: null,
});

const s3Prefix = defineModel('s3Prefix', {
  type: String,
  default: null,
});

const fileExtensions = defineModel('fileExtensions', {
  type: Array,
  default: null,
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

const endpointUrl = defineModel('endpointUrl', {
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
  <!-- Used in ResourceLoaderFormFieldsStandardSourceForm -->
  <ResourceConnectorPaginatedSelect
    v-if="!props.hiddenFields.includes('connectorId')"
    v-model="connectorId"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.CONNECTOR.module ? props.notFoundResource.id : null"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.S3.value },
    ]"
    required
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('s3Bucket')"
    v-slot="{ id, label }"
    :label="$t('__fieldS3Bucket')"
    required
  >
    <AppTextField
      :id="id"
      v-model="s3Bucket"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('s3Prefix')"
    v-slot="{ id }"
    :label="$t('__fieldS3Prefix')"
  >
    <AppTextField
      :id="id"
      v-model="s3Prefix"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('fileExtensions')"
    v-slot="{ id }"
    :label="$t('__fieldFileExtension', 2)"
  >
    <AppAutocomplete
      :id="id"
      v-model="fileExtensions"
      :items="props.fileExtensionItems"
      chips
      multiple
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
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('endpointUrl')"
        v-slot="{ id, label }"
        :label="$t('__fieldEndpointUrl')"
        :tooltip="$t('__tooltipResourceConnectorS3EndpointUrl')"
      >
        <AppTextField
          :id="id"
          v-model="endpointUrl"
          :rules="(
            $validator
              .defineField(label)
              .httpOrHttps()
              .url()
              .collect()
          )"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

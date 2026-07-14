<script setup>
/**
 * @import { ApplicationApiKey } from '~/models/server/applicationApiKey'
 */

/**
 * @type {{ resource: ApplicationApiKey }}
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
 * @type {Ref<ApplicationApiKey>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('applicationApiKeyName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.applicationApiKeyName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .alphaDash()
          .collect()
      )"
    />
  </AppInputGroup>
  <AccountGroupPaginatedSelect
    v-model="formData.applicationApiKeyProperties.groups"
    required
    label="__fieldApplicationApiKeyGroups"
    :tooltip="$t('__tooltipAccountApplicationApiKeyGroups')"
    multiple-select
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id, label }"
    :label="$t('__fieldDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.applicationApiKeyProperties.description"
      :rules="(
        $validator
          .defineField(label)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="props.resource && !props.hiddenFields.includes('isActive')"
    v-slot="{ id, label }"
    :label="$t('__fieldEnabled')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.isActive"
      :rules="(
        $validator
          .defineField(label)
          .collect()
      )"
    />
  </AppInputGroup>
</template>

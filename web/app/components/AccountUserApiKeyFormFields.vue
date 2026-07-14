<script setup>
/**
 * @import { ApiKey } from '~/models/server/apiKey'
 */

/**
 * @type {{ resource: ApiKey }}
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
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

/**
 * @type {Ref<ApiKey>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('apiKeyName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.apiKeyName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .alphaDash()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id, label }"
    :label="$t('__fieldDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
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

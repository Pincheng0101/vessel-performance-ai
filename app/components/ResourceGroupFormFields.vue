<script setup>
/**
 * @import { Group } from '~/models/server/group'
 */

/**
 * @type {{ resource: Group }}
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
 * @type {Ref<Group>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('groupName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.groupName"
      :disabled="!!props.resource"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .apply('noWhitespace')
          .stringLengthLte(64)
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
          .stringLengthLte(255)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('roleArn')"
    v-slot="{ id, label }"
    :label="$t('__fieldRoleArn')"
    :tooltip="$t('__tooltipAccountRoleArn')"
  >
    <AppTextField
      :id="id"
      v-model="formData.roleArn"
      :rules="(
        $validator
          .defineField(label)
          .stringLengthLte(128)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('precedence')"
    v-slot="{ id, label }"
    :label="$t('__fieldPrecedence')"
    :tooltip="$t('__tooltipAccountPrecedence')"
  >
    <AppTextField
      :id="id"
      v-model.integer="formData.precedence"
      type="number"
      :min="0"
      :rules="(
        $validator
          .defineField(label)
          .gte(0)
          .collect()
      )"
    />
  </AppInputGroup>
</template>

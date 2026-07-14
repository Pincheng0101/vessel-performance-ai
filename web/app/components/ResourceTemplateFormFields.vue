<script setup>
/**
 * @import { Template } from '~/models/server/template'
 */

/**
 * @type {{ resource: Template }}
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
 * @type {Ref<Template>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('templateName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.templateName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('template')"
    v-slot="{ id, label }"
    :label="$t('__fieldTemplate')"
    :tooltip="$t('__tooltipResourceTemplateTemplate')"
    required
  >
    <AppJinjaEditor
      :id="id"
      v-model="formData.template"
      fill-height
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

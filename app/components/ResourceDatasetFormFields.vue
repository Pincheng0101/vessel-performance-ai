<script setup>
/**
 * @import { Dataset } from '~/models/server/dataset'
 */

/**
 * @type {{ resource: Dataset }}
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
 * @type {Ref<Dataset>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

if (!formData.value) {
  formData.value = {};
}

if (!Array.isArray(formData.value.inputFields)) {
  formData.value.inputFields = [];
}

if (!Array.isArray(formData.value.outputFields)) {
  formData.value.outputFields = [];
}
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('datasetName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.datasetName"
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
    v-if="!props.hiddenFields.includes('inputFields')"
    :label="$t('__fieldInputField', 2)"
  >
    <ResourceDatasetFieldTable v-model="formData.inputFields" />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('outputFields')"
    :label="$t('__fieldOutputField', 2)"
  >
    <ResourceDatasetFieldTable v-model="formData.outputFields" />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id }"
    :label="$t('__fieldDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
    />
  </AppInputGroup>
</template>

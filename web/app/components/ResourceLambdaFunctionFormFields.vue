<script setup>
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
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('lambdaFunctionName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.lambdaFunctionName"
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
    v-if="!props.hiddenFields.includes('lambdaArn')"
    v-slot="{ id, label }"
    :label="$t('__fieldLambdaArn')"
    :tooltip="$t('__tooltipLambdaArn')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.lambdaArn"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .apply('lambdaArn')
          .collect()
      )"
    />
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

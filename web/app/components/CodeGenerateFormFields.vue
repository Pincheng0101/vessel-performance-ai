<script setup>
import { CodeConstant } from '~/constants';

const formData = defineModel('formData', {
  type: Object,
  required: true,
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldDescription')"
    :tooltip="$t('__tooltipCodeGenerateDescription')"
    required
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthGte(CodeConstant.CodeGenerateDefaultParams.DESCRIPTION.min)
          .stringLengthLte(CodeConstant.CodeGenerateDefaultParams.DESCRIPTION.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ label }"
    :label="$t('__fieldInputSchema')"
    :tooltip="$t('__tooltipCodeGenerateInputSchema')"
  >
    <AppJsonSchemaBuilderInput
      v-model:form-data="formData.inputSchema"
      :label="label"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ label }"
    :label="$t('__fieldInputExamples')"
    :tooltip="$t('__tooltipCodeGenerateInputExamples')"
  >
    <AppJsonEditor
      v-model:object="formData.inputExamples"
      :aria-label="label"
    />
  </AppInputGroup>
</template>

<script setup>
import { VariableConstant } from '~/constants';
import { VariableFactory } from '~/models/server/variable';

/**
 * @import { Variable } from '~/models/server/variable'
 */

/**
 * @type {{ resource: Variable }}
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
 * @type {Ref<Variable>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('variableName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.variableName"
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
    v-if="!props.hiddenFields.includes('variableType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.variableType"
      :disabled="!!props.resource"
      :items="Object.values(VariableConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = VariableFactory.create({
          variableName: formData.variableName,
          variableType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.variableType === VariableConstant.Type.JSON.value">
    <ResourceVariableFormFieldsJson
      v-model:value="formData.value"
      :hidden-fields="props.hiddenFields"
    />
  </template>
</template>

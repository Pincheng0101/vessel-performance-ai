<script setup>
import { TransformationConstant } from '~/constants';
import { TransformationActionExecutionPayloadFactory } from '~/models/server/transformation';

/**
 * @import { Transformation } from '~/models/server/transformation'
 */

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<Transformation>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const handleTypeChange = (v) => {
  formData.value = TransformationActionExecutionPayloadFactory.create({
    transformationType: v,
  });
  props.onUpdate(formData.value);
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.transformationType"
      :items="Object.values(TransformationConstant.Type)"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="handleTypeChange"
    />
  </AppInputGroup>
  <template v-if="formData.transformationType === TransformationConstant.Type.SIMPLIFIED_TO_TRADITIONAL_CHINESE.value">
    <ActionTransformationFormFieldsSimplifiedToTraditionalChinese
      v-model:input="formData.input"
      :on-update="props.onUpdate"
    />
  </template>
</template>

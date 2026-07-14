<script setup>
import { EmbeddingModelConstant } from '~/constants';
import { EmbeddingModelFactory } from '~/models/server/embeddingModel';

/**
 * @import { EmbeddingModel } from '~/models/server/embeddingModel'
 */

/**
 * @type {{ resource: EmbeddingModel }}
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
 * @type {Ref<EmbeddingModel>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('embeddingModelName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.embeddingModelName"
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
    v-if="!props.hiddenFields.includes('embeddingModelType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.embeddingModelType"
      :disabled="!!props.resource"
      :items="Object.values(EmbeddingModelConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = EmbeddingModelFactory.create({
          embeddingModelName: formData.embeddingModelName,
          embeddingModelType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.embeddingModelType === EmbeddingModelConstant.Type.BEDROCK_COHERE.value">
    <ResourceEmbeddingModelFormFieldsBedrockCohere
      v-model:embedding-type="formData.embeddingType"
      v-model:input-type="formData.inputType"
      v-model:max-tokens="formData.maxTokens"
      v-model:model="formData.model"
      v-model:output-dimension="formData.outputDimension"
      v-model:region="formData.region"
      v-model:truncate="formData.truncate"
      :hidden-fields="props.hiddenFields"
    />
  </template>
</template>

<script setup>
import { RankerConstant } from '~/constants';
import { RankerFactory } from '~/models/server/ranker';

/**
 * @import { Ranker } from '~/models/server/ranker'
 */

/**
 * @type {{ resource: Ranker }}
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
 * @type {Ref<Ranker>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('rankerName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.rankerName"
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
    v-if="!props.hiddenFields.includes('rankerType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.rankerType"
      :disabled="!!props.resource"
      :items="Object.values(RankerConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = RankerFactory.create({
          rankerName: formData.rankerName,
          rankerType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.rankerType">
    <template v-if="formData.rankerType === RankerConstant.Type.EMBEDDING.value">
      <ResourceRankerFormFieldsEmbedding
        v-model:embedding-model-id="formData.embeddingModelId"
        :hidden-fields="hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </template>
    <template v-else-if="formData.rankerType === RankerConstant.Type.COHERE.value">
      <ResourceRankerFormFieldsCohere
        v-model:model-id="formData.modelId"
        v-model:region="formData.region"
        :hidden-fields="hiddenFields"
      />
    </template>
    <template v-else-if="formData.rankerType === RankerConstant.Type.AMAZON.value">
      <ResourceRankerFormFieldsAmazon
        v-model:model-id="formData.modelId"
        v-model:region="formData.region"
        :hidden-fields="hiddenFields"
      />
    </template>
  </template>
</template>

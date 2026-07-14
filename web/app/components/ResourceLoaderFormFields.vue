<script setup>
import { LoaderConstant } from '~/constants';
import { LoaderFactory } from '~/models/server/loader';

/**
 * @import { Loader } from '~/models/server/loader'
 */

const { disabledLoaderTypes } = useFeature();

/**
 * @type {{ resource: Loader }}
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
 * @type {Ref<Loader>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

/**
 * @type {Ref<LoaderErrorResponse>}
 */
const errors = defineModel('errors', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('loaderName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.loaderName"
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
    v-if="!props.hiddenFields.includes('loaderType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.loaderType"
      :disabled="!!props.resource"
      :items="Object.values(LoaderConstant.Type).map(item => ({
        ...item,
        disabled: disabledLoaderTypes.map(type => type.value).includes(item.value),
        title: $t(item.i18nTitle),
        subtitle: $t(item.i18nSubtitle),
      }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = LoaderFactory.create({
          loaderName: formData.loaderName,
          loaderType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.loaderType === LoaderConstant.Type.STANDARD.value">
    <ResourceLoaderFormFieldsStandard
      v-model:errors="errors"
      v-model:sources="formData.sources"
      v-model:knowledge-base-id="formData.knowledgeBaseId"
      v-model:retriever-ids="formData.retrieverIds"
      v-model:cron="formData.cron"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
  <template v-else-if="formData.loaderType === LoaderConstant.Type.UNSUPERVISED.value">
    <ResourceLoaderFormFieldsUnsupervised
      v-model:errors="errors"
      v-model:sources="formData.sources"
      v-model:knowledge-base-id="formData.knowledgeBaseId"
      v-model:retriever-ids="formData.retrieverIds"
      v-model:parser-mode="formData.parserMode"
      v-model:cron="formData.cron"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :not-found-resource="props.notFoundResource"
    />
  </template>
</template>

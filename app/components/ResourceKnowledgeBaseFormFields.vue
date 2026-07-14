<script setup>
import { KnowledgeBaseConstant } from '~/constants';

/**
 * @import { KnowledgeBase } from '~/models/server/knowledgeBase'
 */

const { disabledKnowledgeBaseTypes } = useFeature();

/**
 * @type {{ resource: KnowledgeBase }}
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
 * @type {Ref<KnowledgeBase>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('knowledgeBaseName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.knowledgeBaseName"
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
    v-if="!props.hiddenFields.includes('knowledgeBaseType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.knowledgeBaseType"
      :disabled="!!props.resource"
      :items="Object.values(KnowledgeBaseConstant.Type).map(item => ({
        ...item,
        disabled: disabledKnowledgeBaseTypes.map(type => type.value).includes(item.value),
        subtitle: $t(item.i18nSubtitle),
      }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

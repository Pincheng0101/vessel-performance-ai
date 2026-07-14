<script setup>
import { ContentBlockConstant } from '~/constants';

/**
 * @import { ContentBlock } from '~/models/server/contentBlock'
 */

const props = defineProps({
  llmId: {
    type: String,
    default: '',
  },
  llmType: {
    type: String,
    default: '',
  },
});

/**
 * @type {Ref<ContentBlock>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  storage: {
    storageId: null,
  },
});

const initializeState = () => {
  if (formData.value) {
    state.storage = {
      ...state.storage,
      storageId: formData.value.storageId,
    };
  }
};

initializeState();
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
  >
    <AppTextField
      :id="id"
      v-model="formData.contentBlockName"
      :rules="(
        $validator
          .defineField(label)
          .alphaDashDot()
          .stringLengthLte(64)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.contentBlockType"
      :items="[
        ContentBlockConstant.Type.TEXT,
        ContentBlockConstant.Type.IMAGE,
        ContentBlockConstant.Type.ATTACHMENT,
      ].map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <template v-if="formData.contentBlockType === ContentBlockConstant.Type.TEXT.value">
    <ContentBlockFormFieldsText
      v-model:prompt-template="formData.promptTemplate"
      v-model:text="formData.text"
      :llm-id="props.llmId"
    />
  </template>
  <template v-else-if="formData.contentBlockType === ContentBlockConstant.Type.IMAGE.value">
    <ContentBlockFormFieldsImage
      v-model:data="formData.data"
      v-model:detail="formData.detail"
      v-model:media-type="formData.mediaType"
      v-model:max-width-px="formData.maxWidthPx"
      v-model:max-height-px="formData.maxHeightPx"
      v-model:url="formData.url"
    />
  </template>
  <template v-else-if="formData.contentBlockType === ContentBlockConstant.Type.ATTACHMENT.value">
    <ContentBlockFormFieldsAttachment
      v-model:storage="state.storage"
      v-model:object-paths="formData.objectPaths"
      v-model:skip-invalid-attachment="formData.skipInvalidAttachment"
      v-model:parser-type="formData.parserType"
      :llm-type="props.llmType"
      @update:storage="(v) => {
        formData.storageId = v.storageId;
      }"
    />
  </template>
</template>

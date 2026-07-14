<script setup>
import { ContentBlockConstant } from '~/constants';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  llmType: {
    type: String,
    default: '',
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  formData: {
    contentBlockType: ContentBlockConstant.Type.ATTACHMENT.value,
    contentBlockName: '',
    objectPaths: [],
    skipInvalidAttachment: false,
    parserType: ContentBlockConstant.AttachmentParserType.DEFAULT.value,
    storageId: null,
  },
  storage: {
    storageId: null,
  },
});

if (props.item) {
  state.formData = {
    ...state.formData,
    ...objUtils.toRaw(props.item),
  };
}

state.storage = {
  ...state.storage,
  storageId: state.formData.storageId,
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldContent') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.contentBlockName"
          :rules="(
            $validator
              .defineField(label)
              .alphaDashDot()
              .stringLengthLte(64)
              .collect()
          )"
        />
      </AppInputGroup>
      <ContentBlockFormFieldsAttachment
        v-model:storage="state.storage"
        v-model:object-paths="state.formData.objectPaths"
        v-model:skip-invalid-attachment="state.formData.skipInvalidAttachment"
        v-model:parser-type="state.formData.parserType"
        :llm-type="props.llmType"
        @update:storage="(v) => {
          state.formData.storageId = v.storageId;
        }"
      />
    </template>
  </AppForm>
</template>

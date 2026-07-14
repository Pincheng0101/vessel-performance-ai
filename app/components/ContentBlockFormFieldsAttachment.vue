<script setup>
import { ContentBlockConstant } from '~/constants';
import { Storage } from '~/models/server/storage';

const props = defineProps({
  llmType: {
    type: String,
    default: '',
  },
});

const storage = defineModel('storage', {
  type: [String, Object],
  default: {
    storageId: null,
  },
});

const objectPaths = defineModel('objectPaths', {
  type: [String, Array],
  default: [],
});

const skipInvalidAttachment = defineModel('skipInvalidAttachment', {
  type: Boolean,
  default: false,
});

const parserType = defineModel('parserType', {
  type: String,
  default: ContentBlockConstant.AttachmentParserType.DEFAULT.value,
});

const state = reactive({
  storageResource: null,
  refresh: 0,
  useStateInputStorageResource: false,
  useStateInputObjectPaths: false,
});

const allowedExtensionItems = computed(() => (
  ContentBlockConstant.AttachmentExtendedDocsSupportedLlmTypes.includes(props.llmType)
    ? ContentBlockConstant.AttachmentSupportedExtensions.EXTENDED_DOCS
    : ContentBlockConstant.AttachmentSupportedExtensions.DEFAULT
));
const allowedExtensionSet = computed(() => (new Set(allowedExtensionItems.value.map(({ value }) => value.replace(/^\./, '').toLowerCase()))));
const allowedContentTypeSet = computed(() => (new Set(allowedExtensionItems.value.map(item => item.mediaType))));

const disableAttachmentCondition = computed(() => ({
  conditions: [
    {
      field: 'objectPath',
      operator: (objectPath, _, item) => {
        if (!objectPath) return false;
        const fileName = pathUtils.extractLast(objectPath);
        const fileExtension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
        const contentType = item.contentType || '';
        const isExtValid = allowedExtensionSet.value.has(fileExtension);
        if (!fileExtension) {
          return !allowedContentTypeSet.value.has(contentType);
        }
        return !isExtValid;
      },
      value: null,
    },
  ],
}));

const handleStorageResourceChange = (v) => {
  if (!v) return;
  if (jsonPathUtils.isJsonPath(v)) {
    storage.value = new Storage({
      storageId: v,
    });
    state.storageResource = v;
    return;
  }
  state.refresh += 1;
  storage.value = new Storage({
    ...storage.value,
    storageId: v.storageId,
  });
  if (!jsonPathUtils.isJsonPath(objectPaths)) {
    objectPaths.value = null;
  }
};

const initializeState = () => {
  if (storage.value.storageId) {
    state.useStateInputStorageResource = jsonPathUtils.isJsonPath(storage.value.storageId);
    state.storageResource = state.useStateInputStorageResource ? storage.value.storageId : new Storage(storage.value);
  }
  if (objectPaths.value) {
    state.useStateInputObjectPaths = Array.isArray(objectPaths.value)
      ? objectPaths.value.some(item => jsonPathUtils.isJsonPath(item))
      : jsonPathUtils.isJsonPath(objectPaths.value);
  }
};

initializeState();
</script>

<template>
  <ResourceStoragePaginatedSelect
    v-model="state.storageResource"
    v-model:use-state-input="state.useStateInputStorageResource"
    v-model:restored-objects="state.storageResource"
    enable-state-input-switch
    required
    @update:model-value="handleStorageResourceChange"
    @update:use-state-input="(v) => {
      state.useStateInputObjectPaths = v || state.useStateInputObjectPaths;
      if (!jsonPathUtils.isJsonPath(objectPaths)) {
        // Reset other fields when switching to state input
        objectPaths = '$';
      }
    }"
  />
  <ResourceStorageObjectSelect
    v-if="state.storageResource || objectPaths"
    :key="`${state.refresh}-${state.useStateInputStorageResource}`"
    v-model="objectPaths"
    v-model:use-state-input="state.useStateInputObjectPaths"
    :enable-state-input-switch="!state.useStateInputStorageResource"
    :disabled="!state.storageResource"
    :storage="state.storageResource"
    :disable-condition="disableAttachmentCondition"
    :disabled-tooltip="$t('__tooltipOnlySupportedFileTypes', { fileTypes: allowedExtensionItems?.map(item => item.title).join(', ') })"
    :return-object="false"
    multiple-select
    @update:use-state-input="() => objectPaths = state.useStateInputObjectPaths ? '$' : []"
  />
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldParserType')"
    :tooltip="$t('__tooltipContentBlockAttachmentParserType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="parserType"
      :items="Object.values(ContentBlockConstant.AttachmentParserType).map((item) => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldSkipInvalidAttachment')"
  >
    <AppSwitch
      :id="id"
      v-model="skipInvalidAttachment"
    />
  </AppInputGroup>
</template>

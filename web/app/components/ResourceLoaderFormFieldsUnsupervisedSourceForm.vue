<script setup>
import { FileExtensionConstant, LoaderConstant } from '~/constants';

/**
 * @import { LoaderSource } from '~/models/server/loader/loaderSource'
 */

/**
 * @type {{ item: LoaderSource }}
 */
const props = defineProps({
  item: {
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
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const state = reactive({
  /**
   * @type {LoaderSource}
   */
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const { isFirstPartyEnv } = useRuntimeConfig().public;

const { supportedFileExtensions, supportedSourceTypes } = LoaderConstant.Type.UNSUPERVISED;

const structuredFileExtensions = [
  FileExtensionConstant.Base.CSV.value,
  FileExtensionConstant.Base.JSON.value,
  FileExtensionConstant.Base.JSONL.value,
  FileExtensionConstant.Base.TSV.value,
];

const sourceTypeItems = computed(() => (
  Object.values(LoaderConstant.SourceType)
    .filter(item => supportedSourceTypes.includes(item.value))
    .filter(item => (
      isFirstPartyEnv
      || !LoaderConstant.FirstPartyOnlySourceTypes.includes(item.value)
    ))
    .map(item => ({ ...item, subtitle: t(item.i18nSubtitle) }))
));

const fileExtensionItems = computed(() => (
  Object.values(FileExtensionConstant.Base)
    .filter(item => supportedFileExtensions.includes(item.value))
));

const normalizedFileExtensions = computed(() => {
  return arrUtils.cast(state.formData.fileExtensions).filter(Boolean);
});

const selectedFileExtensions = computed(() => {
  return arrUtils.deduplicate(normalizedFileExtensions.value);
});

const mayContainNonStructuredFileExtensions = computed(() => (
  selectedFileExtensions.value.length === 0
  || selectedFileExtensions.value.some(fileExtension => !structuredFileExtensions.includes(fileExtension))
));

const migrateFileExtensionToFileExtensions = () => {
  const resolvedFileExtensions = arrUtils.deduplicate([
    state.formData.fileExtension,
    ...normalizedFileExtensions.value,
  ].filter(Boolean));
  state.formData.fileExtensions = resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
  delete state.formData.fileExtension;
};

const submit = async () => {
  /**
   * @type {LoaderSource}
   */
  const formData = objUtils.toRaw(state.formData);
  formData.fileExtensions = selectedFileExtensions.value;
  delete formData.fileExtension;
  if (props.hiddenFields.includes('retrieverTemplate')) {
    delete formData.retrieverTemplate;
  }
  await props.onSubmit(formData);
};

onMounted(() => {
  migrateFileExtensionToFileExtensions();
  if (!props.hiddenFields.includes('retrieverTemplate')) {
    state.formData.retrieverTemplate ??= '{{ chunk }}';
  }
});
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldSource') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldType')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.formData.sourceType"
          :items="sourceTypeItems"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="(v) => {
            // Reset connector id when connector type changed
            state.formData.connectorId = null;
          }"
        />
      </AppInputGroup>
      <template v-if="state.formData.sourceType">
        <template v-if="state.formData.sourceType === LoaderConstant.SourceType.S3.value">
          <ResourceConnectorFormFieldsS3
            v-model:connector-id="state.formData.connectorId"
            v-model:s3-bucket="state.formData.s3Bucket"
            v-model:s3-prefix="state.formData.s3Prefix"
            v-model:file-extensions="state.formData.fileExtensions"
            :file-extension-items="fileExtensionItems"
            :hidden-fields="['awsAccessKeyId', 'awsSecretAccessKey', 'accountId', 'credentialType', 'roleName', 'endpointUrl']"
            :not-found-resource="props.notFoundResource"
          />
        </template>
        <template v-else-if="state.formData.sourceType === LoaderConstant.SourceType.STORAGE.value">
          <ResourceLoaderFormFieldsStorage
            v-model:common-prefix="state.formData.commonPrefix"
            v-model:file-extensions="state.formData.fileExtensions"
            v-model:storage-id="state.formData.storageId"
            :file-extension-items="fileExtensionItems"
          />
        </template>
        <ResourceLlmPaginatedSelect
          v-model="state.formData.llmId"
          :return-object="false"
          :required="mayContainNonStructuredFileExtensions"
        />
        <AppInputGroup
          v-if="!props.hiddenFields.includes('retrieverTemplate')"
          v-slot="{ id }"
          :label="$t('__fieldRetrieverTemplate')"
          :tooltip="$t('__tooltipResourceRetrieverTemplate')"
        >
          <AppJinjaEditor
            :id="id"
            v-model="state.formData.retrieverTemplate"
          />
        </AppInputGroup>
        <!-- Show on edit page or when data fields are enabled -->
        <AppInputGroup
          v-if="props.item || (selectedFileExtensions.length > 0 && !mayContainNonStructuredFileExtensions)"
          v-slot="{ id }"
          :label="$t('__fieldDataField', 2)"
          :tooltip="$t('__tooltipResourceLoaderConnectorDataFields')"
        >
          <!-- Uses string array input, src_field and dest_field share the same value for simplicity -->
          <AppCombobox
            :id="id"
            v-model="state.formData.dataFields"
            :disabled="selectedFileExtensions.length === 0 || mayContainNonStructuredFileExtensions"
          />
        </AppInputGroup>
        <AppInputGroup
          v-slot="{ label }"
          :label="$t('__fieldAugmentedFieldAfterChunking', 2)"
        >
          <ResourceLoaderFormFieldsAugmentedFieldTable
            v-model="state.formData.augmentedFieldsAfterChunking"
            :aria-label="label"
          />
        </AppInputGroup>
      </template>
    </template>
  </AppForm>
</template>

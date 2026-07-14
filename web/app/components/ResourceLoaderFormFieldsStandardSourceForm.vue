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

const { supportedFileExtensions, supportedSourceTypes } = LoaderConstant.Type.STANDARD;

const structuredFileExtensions = [
  FileExtensionConstant.Base.CSV.value,
  FileExtensionConstant.Base.JSON.value,
  FileExtensionConstant.Base.JSONL.value,
  FileExtensionConstant.Base.TSV.value,
  FileExtensionConstant.Base.GZ.value,
];

const CHUNKING_TEMPLATE_DEFAULT = '{{ content }}';

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

const hasNonStructuredFileExtensions = computed(() => (
  selectedFileExtensions.value.some(fileExtension => !structuredFileExtensions.includes(fileExtension))
));

const isDataFieldsEnabled = computed(() => (
  (selectedFileExtensions.value.length > 0 && !hasNonStructuredFileExtensions.value)
  || state.formData.sourceType === LoaderConstant.SourceType.OPENSEARCH.value
  || state.formData.sourceType === LoaderConstant.SourceType.MYSQL.value
  || state.formData.sourceType === LoaderConstant.SourceType.API.value
));

const isChunkingTemplateVisible = computed(() => (
  !props.hiddenFields.includes('chunkingTemplate') && state.formData.chunkerId
));

const isChunkingTemplateForcedToDefault = computed(() => (
  isChunkingTemplateVisible.value
  && [
    LoaderConstant.SourceType.S3.value,
    LoaderConstant.SourceType.STORAGE.value,
  ].includes(state.formData.sourceType)
  && selectedFileExtensions.value.length > 0
  && selectedFileExtensions.value.every(fileExtension => !structuredFileExtensions.includes(fileExtension))
));

const migrateFileExtensionToFileExtensions = () => {
  const resolvedFileExtensions = arrUtils.deduplicate([
    state.formData.fileExtension,
    ...normalizedFileExtensions.value,
  ].filter(Boolean));
  state.formData.fileExtensions = resolvedFileExtensions.length > 0 ? resolvedFileExtensions : null;
  delete state.formData.fileExtension;
};

const setVisibleTemplateDefaults = () => {
  if (!props.hiddenFields.includes('retrieverTemplate')) {
    state.formData.retrieverTemplate ??= '{{ chunk }}';
  }
};

const removeHiddenTemplateFields = (formData) => {
  if (!isChunkingTemplateVisible.value) {
    delete formData.chunkingTemplate;
  }
  if (props.hiddenFields.includes('retrieverTemplate')) {
    delete formData.retrieverTemplate;
  }
};

const submit = async () => {
  /**
   * @type {LoaderSource}
   */
  const formData = objUtils.toRaw(state.formData);
  formData.fileExtensions = selectedFileExtensions.value;
  delete formData.fileExtension;
  if (isChunkingTemplateForcedToDefault.value) {
    formData.chunkingTemplate = CHUNKING_TEMPLATE_DEFAULT;
  }
  removeHiddenTemplateFields(formData);
  await props.onSubmit(formData);
};

watch(
  () => [isChunkingTemplateVisible.value, isChunkingTemplateForcedToDefault.value],
  ([isVisible, isForced]) => {
    if (!isVisible) return;
    if (isForced) {
      state.formData.chunkingTemplate = CHUNKING_TEMPLATE_DEFAULT;
      return;
    }
    state.formData.chunkingTemplate ??= CHUNKING_TEMPLATE_DEFAULT;
  },
  { immediate: true },
);

onMounted(() => {
  migrateFileExtensionToFileExtensions();
  setVisibleTemplateDefaults();
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
        <template v-else-if="state.formData.sourceType === LoaderConstant.SourceType.OPENSEARCH.value">
          <ResourceConnectorFormFieldsOpenSearch
            v-model:connector-id="state.formData.connectorId"
            v-model:index-name="state.formData.indexName"
            v-model:last-modified-ts-field="state.formData.lastModifiedTsField"
            :hidden-fields="['openSearchHost', 'openSearchPort']"
            :not-found-resource="props.notFoundResource"
          />
        </template>
        <template v-else-if="state.formData.sourceType === LoaderConstant.SourceType.MYSQL.value">
          <ResourceConnectorFormFieldsMySql
            v-model:connector-id="state.formData.connectorId"
            v-model:database-name="state.formData.databaseName"
            v-model:table-name="state.formData.tableName"
            v-model:last-modified-ts-field="state.formData.lastModifiedTsField"
            :hidden-fields="['mysqlHost', 'mysqlPort', 'mysqlUsername', 'mysqlPassword']"
            :not-found-resource="props.notFoundResource"
          />
        </template>
        <template v-else-if="state.formData.sourceType === LoaderConstant.SourceType.API.value">
          <ResourceConnectorFormFieldsHttp
            v-model:connector-id="state.formData.connectorId"
            :hidden-fields="['headers']"
            :not-found-resource="props.notFoundResource"
          />
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldEndpointUrl')"
            :tooltip="$t('__tooltipHttpUrl')"
            required
          >
            <AppTextField
              :id="id"
              v-model="state.formData.endpointUrl"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .httpOrHttps()
                  .url()
                  .collect()
              )"
            />
          </AppInputGroup>
        </template>
        <template v-else-if="state.formData.sourceType === LoaderConstant.SourceType.STORAGE.value">
          <ResourceLoaderFormFieldsStorage
            v-model:common-prefix="state.formData.commonPrefix"
            v-model:file-extensions="state.formData.fileExtensions"
            v-model:storage-id="state.formData.storageId"
            :file-extension-items="fileExtensionItems"
          />
        </template>
        <ResourceChunkerPaginatedSelect
          v-model="state.formData.chunkerId"
          :return-object="false"
          clearable
        />
        <AppInputGroup
          v-if="isChunkingTemplateVisible"
          v-slot="{ id, label }"
          :label="$t('__fieldChunkingTemplate')"
          :tooltip="$t('__tooltipResourceChunkingTemplate')"
          :required="!!state.formData.chunkerId"
        >
          <AppJinjaEditor
            :id="id"
            v-model="state.formData.chunkingTemplate"
            :readonly="isChunkingTemplateForcedToDefault"
            :rules="(
              $validator
                .defineField(label)
                .when({
                  required: !!state.formData.chunkerId,
                })
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
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
          v-if="props.item || isDataFieldsEnabled"
          v-slot="{ id }"
          :label="$t('__fieldDataField', 2)"
          :tooltip="$t('__tooltipResourceLoaderConnectorDataFields')"
        >
          <!-- Uses string array input, src_field and dest_field share the same value for simplicity -->
          <AppCombobox
            :id="id"
            v-model="state.formData.dataFields"
            :disabled="!isDataFieldsEnabled"
          />
        </AppInputGroup>
        <AppInputGroup
          v-slot="{ label }"
          :label="$t('__fieldAugmentedFieldBeforeChunking', 2)"
        >
          <ResourceLoaderFormFieldsAugmentedFieldTable
            v-model="state.formData.augmentedFieldsBeforeChunking"
            :aria-label="label"
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

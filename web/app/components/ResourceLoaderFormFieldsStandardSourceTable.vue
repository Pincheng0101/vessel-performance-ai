<script setup>
import { ChunkerConstant, ConnectorConstant, LoaderConstant, ResourceConstant, StorageConstant } from '~/constants';
import { LoaderSourceAugmentedField } from '~/models/server/loader/loaderSource';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
  rules: {
    type: Array,
    default: () => [],
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Array,
  default: [],
});

const { resourceMap: connectorResourceMap, restoreResources: restoreConnectorResources } = useRestoredResource({ resourceType: ResourceConstant.Type.CONNECTOR.module, keyField: ResourceConstant.Type.CONNECTOR.id });
const { resourceMap: chunkerResourceMap, restoreResources: restoreChunkerResources } = useRestoredResource({ resourceType: ResourceConstant.Type.CHUNKER.module, keyField: ResourceConstant.Type.CHUNKER.id });
const { resourceMap: storageResourceMap, restoreResources: restoreStorageResources } = useRestoredResource({ resourceType: ResourceConstant.Type.STORAGE.module, keyField: ResourceConstant.Type.STORAGE.id });

const state = reactive({
  isLoading: false,
});

const headers = computed(() => {
  const activeTypes = [...new Set(model.value.map(item => item.sourceType))];
  const isTypeActive = (...types) => {
    return types.some(type => activeTypes.includes(type));
  };
  const { S3, OPENSEARCH, MYSQL, API, STORAGE } = LoaderConstant.SourceType;
  const getConnector = id => connectorResourceMap.value[id];
  const getChunker = id => chunkerResourceMap.value[id];
  const getStorage = id => storageResourceMap.value[id];
  return [
    { title: t('__fieldType'), key: 'sourceType', value: item => findField(LoaderConstant.SourceType, item.sourceType, 'title'), iconPath: item => findField(LoaderConstant.SourceType, item.sourceType, 'iconPath') },
    { title: t('__fieldConnector'), key: 'connectorId', value: item => getConnector(item.connectorId)?.name || item.connectorId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }), iconPath: item => findField(ConnectorConstant.Type, getConnector(item.connectorId)?.connectorType, 'iconPath'), isHidden: !isTypeActive(S3.value, OPENSEARCH.value, MYSQL.value, API.value) },
    { title: t('__fieldStorage'), key: 'storageId', value: item => getStorage(item.storageId)?.name || item.storageId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.storageId), target: '_blank' }), iconPath: StorageConstant.Type.STORAGE.iconPath, isHidden: !isTypeActive(STORAGE.value) },
    { title: t('__fieldFolder'), key: 'commonPrefix', isHidden: !isTypeActive(STORAGE.value) },
    { title: t('__fieldChunker'), key: 'chunkerId', value: item => getChunker(item.chunkerId)?.name || item.chunkerId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, item.chunkerId), target: '_blank' }), iconPath: item => findField(ChunkerConstant.Type, getChunker(item.chunkerId)?.chunkerType, 'iconPath') },
    { title: t('__fieldChunkingTemplate'), key: 'chunkingTemplate', isJinjaCode: true },
    { title: t('__fieldRetrieverTemplate'), key: 'retrieverTemplate', isJinjaCode: true, isHidden: props.hiddenFields.includes('retrieverTemplate') },
    { title: t('__fieldS3Bucket'), key: 's3Bucket', isHidden: !isTypeActive(S3.value) },
    { title: t('__fieldS3Prefix'), key: 's3Prefix', isHidden: !isTypeActive(S3.value) },
    { title: t('__fieldFileExtension', 2), key: 'fileExtensions', isChip: true, isHidden: !isTypeActive(S3.value, STORAGE.value) },
    { title: t('__fieldOpenSearchIndexName'), key: 'indexName', isHidden: !isTypeActive(OPENSEARCH.value) },
    { title: t('__fieldDatabaseName'), key: 'databaseName', isHidden: !isTypeActive(MYSQL.value) },
    { title: t('__fieldDatabaseTableName'), key: 'tableName', isHidden: !isTypeActive(MYSQL.value) },
    { title: t('__fieldLastModifiedTsField'), key: 'lastModifiedTsField', isHidden: !isTypeActive(OPENSEARCH.value, MYSQL.value) },
    { title: t('__fieldDataField', 2), key: 'dataFields' },
    { title: t('__fieldAugmentedFieldBeforeChunking', 2), key: 'augmentedFieldsBeforeChunking', value: item => LoaderSourceAugmentedField.sanitize(item.augmentedFieldsBeforeChunking), isJsonCode: true, editorOptions: { maxLines: 5 } },
    { title: t('__fieldAugmentedFieldAfterChunking', 2), key: 'augmentedFieldsAfterChunking', value: item => LoaderSourceAugmentedField.sanitize(item.augmentedFieldsAfterChunking), isJsonCode: true, editorOptions: { maxLines: 5 } },
  ];
});

const restoreResources = (item) => {
  const { connectorId, chunkerId, storageId } = item;
  if (connectorId) restoreConnectorResources([connectorId]);
  if (chunkerId) restoreChunkerResources([chunkerId]);
  if (storageId) restoreStorageResources([storageId]);
};

onMounted(async () => {
  state.isLoading = true;
  await Promise.all([
    restoreConnectorResources(model.value.map(item => item.connectorId)),
    restoreChunkerResources(model.value.map(item => item.chunkerId)),
    restoreStorageResources(model.value.map(item => item.storageId)),
  ]);
  state.isLoading = false;
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="headers"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :server-side="false"
    :loading="state.isLoading"
    bordered
    draggable
    enable-scroll-button
    hide-no-data
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog
        :on-submit="(item) => {
          restoreResources(item);
          onItemUpdate(item)
        }"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceLoaderFormFieldsStandardSourceForm
            :item="item"
            :hidden-fields="props.hiddenFields"
            :not-found-resource="props.notFoundResource"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        @click="onItemRemove"
      />
    </template>
    <template #bottom="{ onItemAdd }">
      <div class="d-flex justify-center">
        <AppDialog
          :on-submit="(item) => {
            restoreResources(item);
            onItemAdd(item);
          }"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              color="primary"
              icon="mdi-plus"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <ResourceLoaderFormFieldsStandardSourceForm
              :hidden-fields="props.hiddenFields"
              :not-found-resource="props.notFoundResource"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

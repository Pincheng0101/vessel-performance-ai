<script setup>
import { ConnectorConstant, LlmConstant, LoaderConstant, ResourceConstant, StorageConstant } from '~/constants';
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
const { resourceMap: storageResourceMap, restoreResources: restoreStorageResources } = useRestoredResource({ resourceType: ResourceConstant.Type.STORAGE.module, keyField: ResourceConstant.Type.STORAGE.id });
const { resourceMap: llmResourceMap, restoreResources: restoreLlmResources } = useRestoredResource({ resourceType: ResourceConstant.Type.LLM.module, keyField: ResourceConstant.Type.LLM.id });

const state = reactive({
  isLoading: false,
});

const headers = computed(() => {
  const activeTypes = [...new Set(model.value.map(item => item.sourceType))];
  const isTypeActive = (...types) => {
    return types.some(type => activeTypes.includes(type));
  };
  const { S3, STORAGE } = LoaderConstant.SourceType;
  const getConnector = id => connectorResourceMap.value[id];
  const getStorage = id => storageResourceMap.value[id];
  const getLlm = id => llmResourceMap.value[id];
  return [
    { title: t('__fieldType'), key: 'sourceType', value: item => findField(LoaderConstant.SourceType, item.sourceType, 'title'), iconPath: item => findField(LoaderConstant.SourceType, item.sourceType, 'iconPath') },
    { title: t('__fieldLlm'), key: 'llmId', value: item => getLlm(item.llmId)?.name || item.llmId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.llmId), target: '_blank' }), iconPath: item => findField(LlmConstant.Type, getLlm(item.llmId)?.llmType, 'iconPath') },
    { title: t('__fieldConnector'), key: 'connectorId', value: item => getConnector(item.connectorId)?.name || item.connectorId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }), iconPath: item => findField(ConnectorConstant.Type, getConnector(item.connectorId)?.connectorType, 'iconPath'), isHidden: !isTypeActive(S3.value) },
    { title: t('__fieldStorage'), key: 'storageId', value: item => getStorage(item.storageId)?.name || item.storageId, link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.storageId), target: '_blank' }), iconPath: StorageConstant.Type.STORAGE.iconPath, isHidden: !isTypeActive(STORAGE.value) },
    { title: t('__fieldFolder'), key: 'commonPrefix', isHidden: !isTypeActive(STORAGE.value) },
    { title: t('__fieldRetrieverTemplate'), key: 'retrieverTemplate', isJinjaCode: true, isHidden: props.hiddenFields.includes('retrieverTemplate') },
    { title: t('__fieldS3Bucket'), key: 's3Bucket', isHidden: !isTypeActive(S3.value) },
    { title: t('__fieldS3Prefix'), key: 's3Prefix', isHidden: !isTypeActive(S3.value) },
    { title: t('__fieldFileExtension', 2), key: 'fileExtensions', isChip: true },
    { title: t('__fieldDataField', 2), key: 'dataFields' },
    { title: t('__fieldAugmentedFieldAfterChunking', 2), key: 'augmentedFieldsAfterChunking', value: item => LoaderSourceAugmentedField.sanitize(item.augmentedFieldsAfterChunking), isJsonCode: true, editorOptions: { maxLines: 5 } },
  ];
});

const restoreResources = (item) => {
  const { connectorId, llmId, storageId } = item;
  if (connectorId) restoreConnectorResources([connectorId]);
  if (llmId) restoreLlmResources([llmId]);
  if (storageId) restoreStorageResources([storageId]);
};

onMounted(async () => {
  state.isLoading = true;
  await Promise.all([
    restoreConnectorResources(model.value.map(item => item.connectorId)),
    restoreLlmResources(model.value.map(item => item.llmId)),
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
          <ResourceLoaderFormFieldsUnsupervisedSourceForm
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
            <ResourceLoaderFormFieldsUnsupervisedSourceForm
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

<script setup>
import { ConnectorConstant, ListConstant, ResourceConstant } from '~/constants';
import ResourceConnectorForm from './ResourceConnectorForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  filterLogic: {
    type: String,
    default: ListConstant.FilterLogic.OR,
  },
  filters: {
    type: Array,
    default: () => [],
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [String, Object],
  default: null,
});

const restoredObjects = defineModel('restoredObjects', {
  type: [String, Object],
  default: null,
});
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    v-model:restored-objects="restoredObjects"
    :field-name="$t('__fieldConnector')"
    :instruction="$t('__instructionResourceConnector')"
    :module="ResourceConstant.Type.CONNECTOR.module"
    :form-component="ResourceConnectorForm"
    :title="$t('__fieldConnector', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'connector_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', iconPath: item => findField(ConnectorConstant.Type, item.type, 'iconPath'), value: item => findField(ConnectorConstant.Type, item.type, 'title') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :filter-logic="props.filterLogic"
    :filters="props.filters"
    :return-object="props.returnObject"
    :required="props.required"
    :not-found-object-id="props.notFoundObjectId"
    :hidden-fields="[
      'connectorId',
      'databaseName',
      'fileExtensions',
      'indexName',
      'lastModifiedTsField',
      's3Bucket',
      's3Prefix',
      'tableName',
    ]"
    @update:model-value="props.onUpdate"
  />
</template>

<script setup>
import { ResourceConstant, SearchEngineConstant } from '~/constants';
import ResourceSearchEngineForm from './ResourceSearchEngineForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
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
    :field-name="$t('__fieldSearchEngine')"
    :instruction="$t('__instructionResourceSearchEngine')"
    :module="ResourceConstant.Type.SEARCH_ENGINE.module"
    :form-component="ResourceSearchEngineForm"
    :title="$t('__fieldSearchEngine', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'search_engine_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(SearchEngineConstant.Type, item.type, 'title'), iconPath: item => findField(SearchEngineConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    @update:model-value="props.onUpdate"
  >
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append" />
    </template>
  </ResourcePaginatedSelect>
</template>

<script setup>
import { ChunkerConstant, ResourceConstant } from '~/constants';
import ResourceChunkerForm from './ResourceChunkerForm';

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
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    :field-name="$t('__fieldChunker')"
    :instruction="$t('__instructionResourceChunker')"
    :module="ResourceConstant.Type.CHUNKER.module"
    :form-component="ResourceChunkerForm"
    :title="$t('__fieldChunker', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'chunker_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, item.id), target: '_blank' }) },
      { title: $t('__fieldType'), key: 'type', value: item => findField(ChunkerConstant.Type, item.type, 'title'), iconPath: item => findField(ChunkerConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    @update:model-value="props.onUpdate"
  />
</template>

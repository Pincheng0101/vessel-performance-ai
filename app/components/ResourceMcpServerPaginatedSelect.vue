<script setup>
import { McpServerConstant, ResourceConstant } from '~/constants';
import ResourceMcpServerForm from './ResourceMcpServerForm.vue';

const props = defineProps({
  required: {
    type: Boolean,
    default: false,
  },
  returnObject: {
    type: Boolean,
    default: true,
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [String, Object],
  default: null,
});

const restoredObject = defineModel('restoredObject', {
  type: Object,
  default: null,
});
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    v-model:restored-objects="restoredObject"
    :field-name="$t('__fieldMcpServer')"
    :instruction="$t('__instructionResourceMcpServer')"
    :module="ResourceConstant.Type.MCP_SERVER.module"
    :form-component="ResourceMcpServerForm"
    :title="$t('__fieldMcpServer', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'mcp_server_name', link: v => ({ href: resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, v.id), target: '_blank' }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', iconPath: v => findField(McpServerConstant.Type, v, 'iconPath'), mutators: [v => { const k = findField(McpServerConstant.Type, v, 'i18nTitle'); return k ? $t(k) : v; }] },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :required="props.required"
    :return-object="props.returnObject"
    :not-found-object-id="props.notFoundObjectId"
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

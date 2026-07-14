<script setup>
import { McpServerConstant } from '~/constants';
import { McpServerFactory } from '~/models/server/mcpServer';

/**
 * @import { McpServer } from '~/models/server/mcpServer'
 */

/**
 * @type {{ resource: McpServer }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

/**
 * @type {Ref<McpServer>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mcpServerName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.mcpServerName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('mcpServerType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.mcpServerType"
      :disabled="!!props.resource"
      :items="Object.values(McpServerConstant.Type).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = McpServerFactory.create({
          mcpServerName: formData.mcpServerName,
          mcpServerType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.mcpServerType === McpServerConstant.Type.STREAMABLE_HTTP.value">
    <ResourceMcpServerFormFieldsStreamableHttp
      v-model:auth="formData.auth"
      v-model:endpoint-url="formData.endpointUrl"
      :hidden-fields="props.hiddenFields"
    />
  </template>
  <template v-else-if="formData.mcpServerType === McpServerConstant.Type.CUSTOM.value">
    <ResourceMcpServerFormFieldsCustom
      v-model:custom-tools="formData.customTools"
      :hidden-fields="props.hiddenFields"
    />
  </template>
</template>

<script setup>
import { JsonSchemaConstant } from '~/constants';

const props = defineProps({
  jsonSchema: {
    type: [Object, String],
    default: null,
  },
});

const propertyKeys = computed(() => {
  if (!props.jsonSchema) {
    return [];
  }
  return Object.entries(props.jsonSchema.properties || {})
    .sort(([, a], [, b]) => (a._order ?? Infinity) - (b._order ?? Infinity))
    .map(([key]) => key);
});
</script>

<template>
  <template v-if="jsonPathUtils.isJsonPath(props.jsonSchema)">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :text="props.jsonSchema"
        icon="mdi-code-json"
      />
    </WorkflowNodeDetailsGroup>
  </template>
  <template v-else>
    <template v-if="propertyKeys.length > 0">
      <WorkflowNodeDetailsGroup>
        <template
          v-for="propertyKey in propertyKeys"
          :key="propertyKey"
        >
          <WorkflowNodeDetails
            :text="propertyKey"
            :icon="findField(JsonSchemaConstant.DataType, jsonSchemaUtils.getMainType(props.jsonSchema.properties[propertyKey]), 'icon')"
          />
        </template>
      </WorkflowNodeDetailsGroup>
    </template>
  </template>
</template>

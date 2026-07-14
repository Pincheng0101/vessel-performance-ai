<script setup>
import { StateConstant } from '~/constants';

const { simulatedOutputMap, inputSchema, useExternalMemoryInput, stateMemoryInputSelector } = useWorkflow();

const props = defineProps({
  id: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
  menuWidth: {
    type: String,
    default: null,
  },
  additionalPathOptions: {
    type: Array,
    default: () => [],
  },
});

const model = defineModel({
  type: undefined,
  default: undefined,
});

const generatePathOptionsFromSimulatedOutput = (simulatedOutputObj) => {
  const result = new Set();

  const traverse = (value, path, resultSet) => {
    if (Array.isArray(value)) {
      const arrayPath = `${path}[*]`;
      resultSet.add(arrayPath);

      // Recursively inspect first element for nested structure (if exists)
      if (value.length > 0) {
        traverse(value[0], arrayPath, resultSet);
      }
      return;
    }
    if (value && typeof value === 'object') {
      for (const key in value) {
        const newPath = `${path}.${key}`;
        resultSet.add(newPath);
        traverse(value[key], newPath, resultSet);
      }
    }
  };

  for (const stateName in simulatedOutputObj) {
    const output = simulatedOutputObj[stateName];
    if (!output || typeof output !== 'object') continue;

    for (const topKey in output) {
      const basePath = referencePathUtils.toDollarPrefix(topKey);
      result.add(basePath);
      traverse(output[topKey], basePath, result);
    }
  }

  return Array.from(result);
};

const generatePathOptionsFromSchemaProperties = (properties) => {
  const result = new Set([]);

  const traverse = (node, path, resultSet) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'object' && node.properties) {
      for (const key in node.properties) {
        const newPath = `${path}.${key}`;
        resultSet.add(newPath);
        traverse(node.properties[key], newPath, resultSet);
      }
      return;
    }
    if (node.type === 'array' && node.items) {
      const arrayPath = `${path}[*]`;
      resultSet.add(arrayPath);
      traverse(node.items, arrayPath, resultSet);
      return;
    }
    if (node.anyOf || node.oneOf || node.allOf) {
      const variants = node.anyOf || node.oneOf || node.allOf;
      for (const variant of variants) {
        traverse(variant, path, resultSet);
      }
    }
  };

  for (const key in properties) {
    const basePath = referencePathUtils.toDollarPrefix(key);
    result.add(basePath);
    traverse(properties[key], basePath, result);
  }

  return Array.from(result);
};

const generatePathOptionsFromStateMemoryInputSelector = (selectorObj) => {
  return Object.keys(selectorObj)
    .map(key => `state_memory.${key}`)
    .map(referencePathUtils.toDollarPrefix);
};

const items = computed(() => {
  const simulatedOutputObj = Object.fromEntries(simulatedOutputMap.value || []);
  const inputSchemaProperties = inputSchema.value?.properties || {};
  const stateMemoryObj = useExternalMemoryInput.value && stateMemoryInputSelector.value ? stateMemoryInputSelector.value : {};
  const pathOptions = [
    '$',
    ...props.additionalPathOptions,
    ...generatePathOptionsFromSimulatedOutput(simulatedOutputObj),
    ...generatePathOptionsFromSchemaProperties(inputSchemaProperties),
    ...generatePathOptionsFromStateMemoryInputSelector(stateMemoryObj),
  ];
  return arrUtils
    .deduplicate(pathOptions)
    .map(option => ({
      title: option,
      value: option,
    }));
});
</script>

<template>
  <AppCombobox
    :id="props.id"
    v-model="model"
    :items="items"
    :rules="(
      $validator
        .defineField(props.label)
        .when({
          required: props.required,
        })
        .required()
        .apply('jsonPath')
        .collect()
    )"
    :multiple="false"
    :chips="false"
    :menu-width="props.menuWidth"
    :hint="$t('__hintJsonPath')"
    :placeholder="StateConstant.StateInputPathPlaceholder.DEFAULT"
  />
</template>

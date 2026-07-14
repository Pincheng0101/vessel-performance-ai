<script setup>
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  schema: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  enableJsonInputSwitch: {
    type: Boolean,
    default: true,
  },
  hideLabel: {
    type: Boolean,
    default: false,
  },
  validateWithSchema: {
    type: Boolean,
    default: true,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const formData = defineModel('formData', {
  type: [Object, String],
  default: {},
  get(value) {
    if (value === null) return {};
    return value;
  },
});

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});

const hasProperties = computed(() => {
  return props.schema && props.schema.properties && Object.keys(props.schema.properties).length > 0;
});

{
  useJsonInput.value = !hasProperties.value;
}
</script>

<template>
  <AppInputGroup
    :label="props.hideLabel ? '' : (props.label || $t('__fieldInput'))"
    :bordered="props.schema && !useJsonInput"
  >
    <template
      v-if="props.enableJsonInputSwitch"
      #right="{ id }"
    >
      <AppSwitch
        :id="`${id}-json-schema-renderer-switch`"
        v-model="useJsonInput"
        :readonly="!hasProperties"
        aria-label="Use JSON"
        density="compact"
        size="xx-small"
        hide-details
        class="mb-0"
      />
      <AppInputLabel
        :for="`${id}-json-schema-renderer-switch`"
        :label="$t('__actionUseJson')"
        class="text-caption mb-0"
      />
    </template>
    <template #default="{ label }">
      <!-- Refresh the form with key when json schema is updated -->
      <AppJsonSchemaRendererInput
        :key="props.schema"
        v-model:form-data="formData"
        v-model:use-json-input="useJsonInput"
        :label="label"
        :schema="props.schema"
        :hidden-field="props.hiddenFields"
        :readonly="props.readonly"
        :validate-with-schema="props.validateWithSchema"
        :on-update="props.onUpdate"
      />
    </template>
  </AppInputGroup>
</template>

<script setup>
const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  itemLabel: {
    type: String,
    default: '',
  },
  keyOptions: {
    type: Array,
    default: () => [],
  },
  keyFieldLabel: {
    type: String,
    default: '',
  },
  keyFieldTooltip: {
    type: String,
    default: '',
  },
  valueFieldLabel: {
    type: String,
    default: '',
  },
  valueFieldTooltip: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const object = defineModel('object', {
  type: [Object, String],
  default: {},
});

const convertToObject = (arr) => {
  // If all keys are unsigned digits, convert to an array
  if (arr.length > 0 && arr.every(item => strUtils.isUnsignedDigits(item.key))) {
    return arr.map(item => item.value);
  }
  // Otherwise, convert to an object with key-value pairs
  return arr.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
};

const convertToTableItems = (obj) => {
  // Ensure obj is an object or an array
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
};

if (object.value) {
  model.value = convertToTableItems(object.value);
}

// Sync local state when the prop changes externally
watch(object, (after) => {
  model.value = convertToTableItems(after);
}, {
  deep: true,
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: props.keyFieldLabel || $t('__fieldKey'), key: 'key' },
      { title: props.valueFieldLabel || $t('__fieldValue'), key: 'value' },
    ]"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :server-side="false"
    bordered
    draggable
    enable-scroll-button
    hide-no-data
    @update:model-value="(v) => {
      object = convertToObject(v);
      props.onUpdate(object);
    }"
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog :on-submit="onItemUpdate">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AppKeyValuePairForm
            :items="model"
            :item="item"
            :item-label="props.itemLabel"
            :key-options="props.keyOptions"
            :key-field-label="props.keyFieldLabel"
            :key-field-tooltip="props.keyFieldTooltip"
            :value-field-label="props.valueFieldLabel"
            :value-field-tooltip="props.valueFieldTooltip"
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
        <AppDialog :on-submit="onItemAdd">
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              color="primary"
              icon="mdi-plus"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AppKeyValuePairForm
              :items="model"
              :item-label="props.itemLabel"
              :key-options="props.keyOptions"
              :key-field-label="props.keyFieldLabel"
              :key-field-tooltip="props.keyFieldTooltip"
              :value-field-label="props.valueFieldLabel"
              :value-field-tooltip="props.valueFieldTooltip"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

<script setup>
const props = defineProps({
  ariaLabel: {
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
  enableSecretValueObject: {
    type: Boolean,
    default: false,
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

const headers = computed(() => [
  { title: $t('__fieldKey'), key: 'key' },
  { title: $t('__fieldValue'), key: 'value', value: item => item.value, isSecret: item => !!item.isSecret },
  ...(props.enableSecretValueObject ? [{ title: $t('__fieldSensitive'), key: 'isSecret', value: item => item.isSecret ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.isSecret ? 'success' : null }) }] : []),
]);

const convertToTableItems = (obj) => {
  // Ensure obj is an object or an array
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }
  return Object.entries(obj).map(([key, rawValue]) => {
    if (!props.enableSecretValueObject) {
      return { key, value: rawValue };
    }
    const value = typeof rawValue === 'object' && rawValue !== null
      ? rawValue.value
      : rawValue;
    const isSecret = typeof rawValue === 'object' && rawValue !== null
      ? rawValue.isSecret ?? false
      : false;
    return { key, value, isSecret };
  });
};

const convertToObject = (arr) => {
  return arr.reduce((acc, item) => {
    acc[item.key] = props.enableSecretValueObject
      ? {
          value: item.value,
          isSecret: item.isSecret ?? false,
        }
      : item.value;
    return acc;
  }, {});
};

const getFormItem = item => props.enableSecretValueObject && item.isSecret ? { ...item, value: '' } : item;

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
    :headers="headers"
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
            :icon="props.enableSecretValueObject && item.isSecret ? 'mdi-lock-reset' : 'mdi-pencil'"
            :tooltip="props.enableSecretValueObject && item.isSecret ? $t('__actionReset') : $t('__actionEdit')"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AppHttpHeaderForm
            :items="model"
            :item="props.enableSecretValueObject && item.isSecret ? getFormItem(item) : item"
            :enable-secret-value-object="props.enableSecretValueObject"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :tooltip="$t('__actionRemove')"
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
            <AppHttpHeaderForm
              :items="model"
              :enable-secret-value-object="props.enableSecretValueObject"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

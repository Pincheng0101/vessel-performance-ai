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
  urlPath: {
    type: String,
    default: '',
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

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});

const convertToTableItems = (obj) => {
  // Ensure obj is an object or an array
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
};

const convertToObject = (arr) => {
  return arr.reduce((acc, item) => {
    // Convert boolean values to strings
    acc[item.key] = typeof item.value === 'boolean' ? String(item.value) : item.value;
    return acc;
  }, {});
};

if (object.value) {
  model.value = convertToTableItems(object.value);
}

// Watch object because it might change from outside
watch(object, (after) => {
  model.value = convertToTableItems(after);
}, {
  deep: true,
});
</script>

<template>
  <template v-if="useJsonInput">
    <AppJsonEditor
      v-model:object="object"
      :aria-label="props.ariaLabel"
      :rules="(
        $validator
          .defineField($t('__fieldInput'))
          .json()
          .collect()
      )"
      :readonly="props.readonly"
      fill-height
      @update:object="(v) => {
        props.onUpdate(v);
      }"
    />
  </template>
  <template v-else>
    <AppTable
      v-model="model"
      :headers="[
        { title: $t('__fieldKey'), key: 'key' },
        { title: $t('__fieldValue'), key: 'value' },
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
            <AppOpenSearchParameterForm
              :items="model"
              :item="item"
              :url-path="props.urlPath"
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
              <AppOpenSearchParameterForm
                :items="model"
                :url-path="props.urlPath"
                :on-submit="onSubmit"
                :on-discard="onCancel"
              />
            </template>
          </AppDialog>
        </div>
      </template>
    </AppTable>
  </template>
</template>

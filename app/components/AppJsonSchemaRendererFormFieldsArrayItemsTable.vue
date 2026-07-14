<script setup>
import { JsonSchemaConstant } from '~/constants';
import { JsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  nestedLevel: {
    type: Number,
    default: 0,
  },
  schema: {
    type: JsonSchema,
    required: true,
  },
  name: {
    type: String,
    default: 'value',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  hint: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Array,
  default: [],
  set(value) {
    if (!value) return value;
    return jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value
      ? value
      : value.map(item => item[props.name]);
  },
  get(value) {
    if (!value) return value;
    return jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value
      ? value
      : value.map(item => ({ [props.name]: item }));
  },
});

const headers = computed(() => {
  if (jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value) {
    if (Object.keys(props.schema.properties || {}).length < 1) {
      return [
        { title: t('__fieldItem'), value: item => item, isJsonCode: true, editorOptions: { minLines: 1, maxLines: 3, disabled: true } },
      ];
    }
    return Object.entries(props.schema.properties || {}).map(([name, property]) => ({
      title: property.title || strUtils.toTitleCase(name),
      key: name,
      value: (item) => {
        const processValue = (v) => {
          if (typeof v === 'string') {
            const parsedFile = fileUtils.parseFromBase64(v);
            if (parsedFile) {
              return parsedFile.mediaType;
            }
          }
          if (typeof v === 'boolean') {
            return v ? t('__fieldYes') : t('__fieldNo');
          }
          if (Array.isArray(v)) {
            const processedArray = v.map(inner => processValue(inner)).filter(Boolean);
            return processedArray.length > 0 ? processedArray : null;
          }
          if (typeof v === 'object' && v !== null) {
            const { length } = Object.keys(v);
            return `${numUtils.format(length)} ${t('__unitProperty', length > 1)}`;
          }
          return v;
        };
        return processValue(item[name]);
      },
    }));
  }
  return [{
    title: t('__fieldItem'),
    key: props.name,
    value: (item) => {
      const processValue = (v) => {
        if (typeof v === 'string') {
          const parsedFile = fileUtils.parseFromBase64(v);
          if (parsedFile) {
            return parsedFile.mediaType;
          }
        }
        if (typeof v === 'boolean') {
          return v ? t('__fieldYes') : t('__fieldNo');
        }
        if (Array.isArray(v)) {
          const processedArray = v.map(inner => processValue(inner)).filter(Boolean);
          return processedArray.length > 0 ? processedArray : null;
        }
        if (typeof v === 'object' && v !== null) {
          const { length } = Object.keys(v);
          return `${numUtils.format(length)} ${t('__unitProperty', length > 1)}`;
        }
        return v;
      };
      return processValue(item[props.name]);
    },
  }];
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="headers"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :draggable="!props.readonly"
    :server-side="false"
    enable-scroll-button
    hide-no-data
    bordered
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog :on-submit="onItemUpdate">
        <template
          v-if="!props.readonly"
          #activator="{ onOpen }"
        >
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AppJsonSchemaRendererFormFieldsArrayItemsForm
            :nested-level="props.nestedLevel + 1"
            :items="model"
            :item="item"
            :schema="props.schema"
            :name="props.name"
            :required="props.required"
            :readonly="props.readonly"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        v-if="!props.readonly"
        icon="mdi-trash-can"
        variant="text"
        @click="onItemRemove"
      />
    </template>
    <template
      v-if="!props.readonly"
      #bottom="{ onItemAdd }"
    >
      <div class="d-flex justify-center">
        <AppDialog :on-submit="onItemAdd">
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              :disabled="!Array.isArray(model) || props.disabled"
              :on-click="onOpen"
              color="primary"
              icon="mdi-plus"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AppJsonSchemaRendererFormFieldsArrayItemsForm
              :nested-level="props.nestedLevel + 1"
              :items="model"
              :schema="props.schema"
              :name="props.name"
              :required="props.required"
              :readonly="props.readonly"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

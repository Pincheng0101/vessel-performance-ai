<script setup>
import { JsonSchemaConstant } from '~/constants';

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
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: Array,
  default: [],
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldName'), key: 'name' },
      { title: $t('__fieldType'), key: 'type', icon: item => findField(JsonSchemaConstant.DataType, jsonSchemaUtils.getMainType(item), 'icon'), value: item => $t(findField(JsonSchemaConstant.DataType, jsonSchemaUtils.getMainType(item), 'i18nTitle') || '__fieldUnknown') },
      { title: $t('__fieldRequired'), key: 'required', value: item => item.required ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.required ? 'success' : null }) },
      { title: $t('__fieldNullable'), key: 'nullable', value: item => jsonSchemaUtils.hasNullType(item) ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: jsonSchemaUtils.hasNullType(item) ? 'success' : null }) },
    ]"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :server-side="false"
    bordered
    draggable
    enable-expand
    enable-scroll-button
    hide-no-data
    item-value="name"
  >
    <template #expanded-row="{ item }">
      <div class="py-3">
        <AppDisplayField
          :item="{
            title: $t('__fieldDetail', 2),
            value: item,
            isJsonCode: true,
          }"
        />
      </div>
    </template>
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
          <AppJsonSchemaBuilderForm
            :items="model"
            :item="item"
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
            <AppJsonSchemaBuilderForm
              :items="model"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

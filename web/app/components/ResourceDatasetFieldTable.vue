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
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledFields: {
    type: Array,
    default: () => [],
  },
  availableNames: {
    type: Array,
    default: () => [],
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  showAddButton: {
    type: Boolean,
    default: true,
  },
  showRemoveButton: {
    type: Boolean,
    default: true,
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Array,
  default: () => [],
});

const headers = computed(() => {
  return [
    { title: t('__fieldName'), key: 'name' },
    { title: t('__fieldDescription'), key: 'description' },
  ];
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
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog
        :on-submit="onItemUpdate"
        aria-label="Edit Dataset Field Dialog"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            :disabled="props.loading"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceDatasetFieldForm
            :item="item"
            :action-label="$t('__actionEdit')"
            :available-names="props.availableNames"
            :used-names="props.usedNames"
            :disabled-fields="props.disabledFields"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        v-if="props.showRemoveButton"
        icon="mdi-trash-can"
        variant="text"
        :disabled="props.loading"
        @click="onItemRemove"
      />
    </template>
    <template #bottom="{ onItemAdd }">
      <div class="d-flex justify-center">
        <AppDialog
          v-if="props.showAddButton"
          :on-submit="onItemAdd"
          aria-label="Create Dataset Field Dialog"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel || $t('__actionAdd')"
              color="primary"
              icon="mdi-plus"
              :disabled="props.loading || props.disabled"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <ResourceDatasetFieldForm
              :available-names="props.availableNames"
              :used-names="props.usedNames"
              :disabled-fields="props.disabledFields"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

<script setup>
const props = defineProps({
  fieldNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: Array,
  default: () => [],
});

const headers = computed(() => {
  return props.fieldNames?.map(fieldName => ({ title: fieldName, value: fieldName }));
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
        aria-label="Edit Dataset Item Dialog"
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
          <ResourceDatasetItemDataForm
            :field-names="props.fieldNames"
            :item="item"
            :action-label="$t('__actionEdit')"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :disabled="props.loading"
        @click="onItemRemove"
      />
    </template>
    <template #bottom="{ onItemAdd }">
      <div class="d-flex justify-center">
        <AppDialog
          :on-submit="onItemAdd"
          aria-label="Create Dataset Item Dialog"
        >
          <template #activator="{ onOpen }">
            <template v-if="$slots['bottom-action']">
              <slot
                name="bottom-action"
                :on-open="onOpen"
              />
            </template>
            <template v-else>
              <AppIconButton
                :aria-label="$t('__actionAdd')"
                color="primary"
                icon="mdi-plus"
                :disabled="props.loading"
                :on-click="onOpen"
              />
            </template>
          </template>
          <template #body="{ onSubmit, onCancel }">
            <ResourceDatasetItemDataForm
              :field-names="props.fieldNames"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

<script setup>
import { DatasetConstant } from '~/constants';

const props = defineProps({
  dataset: {
    type: Object,
    default: null,
  },
  onColumnsAdd: {
    type: Function,
    default: null,
  },
  onColumnsDelete: {
    type: Function,
    default: null,
  },
  onColumnsEdit: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const server = useServer();
const snackbarStore = useSnackbarStore();

const dialogAddRef = ref(null);
const dialogDeleteRef = ref(null);
const dialogDeleteConfirmCardRef = ref(null);
const dialogEditRef = ref(null);

const state = reactive({
  isLoading: false,
  deleteForm: null,
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const combinedFieldNames = computed(() => {
  const inputFieldNames = (props.dataset?.inputFields || []).map(field => field?.name).filter(Boolean);
  const outputFieldNames = (props.dataset?.outputFields || []).map(field => field?.name).filter(Boolean);
  return arrUtils.deduplicate([...inputFieldNames, ...outputFieldNames]);
});

const items = computed(() => [
  {
    title: t('__titleModifyItem', { action: t('__actionAdd'), item: t('__fieldColumn', 2) }),
    value: 'addColumns',
    icon: 'mdi-table-column-plus-after',
    enabled: !!props.onColumnsAdd,
    callback: addColumns,
  },
  {
    title: t('__titleModifyItem', { action: t('__actionDelete'), item: t('__fieldColumn', 2) }),
    value: 'deleteColumns',
    icon: 'mdi-table-column-remove',
    enabled: !!props.onColumnsDelete,
    disabled: combinedFieldNames.value.length === 0,
    callback: deleteColumns,
  },
  {
    title: t('__titleModifyItem', { action: t('__actionEdit'), item: t('__fieldColumn', 2) }),
    value: 'editColumns',
    icon: 'mdi-pencil',
    enabled: !!props.onColumnsEdit,
    disabled: combinedFieldNames.value.length === 0,
    callback: editColumns,
  },
]);

const addColumns = () => {
  dialogAddRef.value.open();
};

const deleteColumns = () => {
  dialogDeleteRef.value.open();
};

const editColumns = () => {
  dialogEditRef.value.open();
};

const handleColumnsDeleteDialogOpen = async (v) => {
  state.deleteForm = v;
  await dialogDeleteConfirmCardRef.value.confirm();
};

const handleColumnsAdd = async (v) => {
  state.isLoading = true;
  if (!props.onColumnsAdd) return;
  const mergeFields = (currentFields, fieldsToAdd) => {
    const normalized = arrUtils.cast(currentFields)
      .concat(arrUtils.cast(fieldsToAdd))
      .map(field => ({
        name: field?.name?.trim?.() || field?.name || '',
        description: field?.description ?? '',
      }))
      .filter(field => field.name);

    return Array.from(
      normalized.reduce((map, field) => {
        if (!map.has(field.name)) {
          map.set(field.name, field);
        } else if (!map.get(field.name).description && field.description) {
          map.get(field.name).description = field.description;
        }
        return map;
      }, new Map()).values(),
    );
  };

  const inputFields = v.fieldType === DatasetConstant.FieldType.INPUT_FIELD ? mergeFields(props.dataset?.inputFields || [], v.fields) : props.dataset?.inputFields || [];
  const outputFields = v.fieldType === DatasetConstant.FieldType.OUTPUT_FIELD ? mergeFields(props.dataset?.outputFields || [], v.fields) : props.dataset?.outputFields || [];

  const { error } = await server.dataset.update({
    ...props.dataset,
    inputFields,
    outputFields,
  });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionAdd');
    return;
  }
  props.onColumnsAdd(v);
  snackbarStore.setActionSuccess('__actionAdd');
  state.isLoading = false;
};

const handleColumnsDelete = async (v) => {
  state.isLoading = true;
  if (!props.onColumnsDelete) return;
  const namesToDelete = new Set(v.names);
  const { error } = await server.dataset.update({
    ...props.dataset,
    inputFields: (props.dataset?.inputFields || []).filter(field => !namesToDelete.has(field?.name)),
    outputFields: (props.dataset?.outputFields || []).filter(field => !namesToDelete.has(field?.name)),
  });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionDelete');
    return;
  }
  props.onColumnsDelete(v);
  snackbarStore.setActionSuccess('__actionDelete');
  state.isLoading = false;
};

const handleColumnsEdit = async (v) => {
  if (!props.onColumnsEdit) return;
  state.isLoading = true;
  const inputFields = (v.fields || []).filter(field => field?.fieldType === DatasetConstant.FieldType.INPUT_FIELD);
  const outputFields = (v.fields || []).filter(field => field?.fieldType === DatasetConstant.FieldType.OUTPUT_FIELD);
  const { error } = await server.dataset.update({
    ...props.dataset,
    inputFields,
    outputFields,
  });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionEdit');
    return;
  }
  props.onColumnsEdit(v);
  snackbarStore.setActionSuccess('__actionEdit');
  state.isLoading = false;
};
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        icon="mdi-table-column"
        variant="text"
        :tooltip="model ? '' : $t('__titleModifyItem', { action: $t('__actionEdit'), item: $t('__fieldDatasetItemColumn') })"
      />
    </template>
    <v-card
      :elevation="1"
      :width="180"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="item in items"
          :key="item.title"
        >
          <v-hover v-slot="{ isHovering, props: hoverProps }">
            <div v-bind="hoverProps">
              <v-list-item
                class="text-body-2"
                :class="{ 'd-none': !item.enabled }"
                :disabled="item.disabled"
                @click="item.callback"
              >
                <template #prepend>
                  <v-icon
                    :icon="item.icon"
                    size="small"
                    color="primary"
                  />
                </template>
                {{ item.title }}
                <template v-if="item.disabled && item.disabledTooltip">
                  <AppTooltip
                    :text="item.disabledTooltip"
                    location="bottom"
                    activator="parent"
                    :model-value="isHovering"
                  />
                </template>
              </v-list-item>
            </div>
          </v-hover>
        </template>
      </v-list>
    </v-card>
  </v-menu>
  <AppDialog
    ref="dialogAddRef"
    :on-submit="handleColumnsAdd"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemColumnAddForm
        :loading="state.isLoading"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog ref="dialogDeleteRef">
    <template #body="{ onCancel }">
      <ResourceDatasetItemColumnDeleteForm
        :loading="state.isLoading"
        :field-names="combinedFieldNames"
        :show-submit-loading="false"
        :on-submit="handleColumnsDeleteDialogOpen"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogDeleteConfirmCardRef"
    :on-submit="async () => {
      await handleColumnsDelete(state.deleteForm)
      dialogDeleteRef.close();
    }"
    :on-cancel="() => {
      state.deleteForm = null;
      state.isLoading = false;
    }"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemColumnDeleteConfirmationCard
        :loading="state.isLoading"
        :column-names="state.deleteForm?.names"
        :item-label="$t('__titleColumn')"
        :on-cancel="onCancel"
        :on-submit="onSubmit"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogEditRef"
    :on-submit="handleColumnsEdit"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemColumnEditForm
        :dataset="props.dataset"
        :loading="state.isLoading"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

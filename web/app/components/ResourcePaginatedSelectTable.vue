<script setup>
import { AccountConstant, ListConstant, ResourceConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();

const props = defineProps({
  module: {
    type: String,
    required: true,
  },
  instruction: {
    type: String,
    default: null,
  },
  fieldName: {
    type: String,
    required: true,
  },
  headers: {
    type: Array,
    required: true,
  },
  formComponent: {
    type: Object,
    default: null,
  },
  allowCreate: {
    type: Boolean,
    default: true,
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedIds: {
    type: Array,
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  filterLogic: {
    type: String,
    default: undefined,
  },
  filters: {
    type: Array,
    default: () => [],
  },
  disableCondition: {
    type: Object,
    default: null,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  restoredObjects: {
    type: Array,
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  perPageOptions: {
    type: Array,
    default: () => ListConstant.ItemsPerPageOption.LIST,
  },
  maxSelectedItems: {
    type: Number,
    default: null,
  },
});

const { page, perPage, sortField, sortOrder, query, nextTokenMap } = usePagination({
  perPageOptions: props.perPageOptions,
});

const dialogRef = ref(null);

const state = reactive({
  selectedItems: props.restoredObjects ? [...props.restoredObjects] : [],
  items: [],
  isLoading: false,
});

const selectableModules = {
  ...ResourceConstant.Type,
  ADMIN_MANAGED_GROUP: AccountConstant.Base.ADMIN_MANAGED_GROUP,
  ADMIN_MANAGED_USER: AccountConstant.Base.ADMIN_MANAGED_USER,
};

const icon = computed(() => {
  return findField(selectableModules, props.module, 'icon', 'module');
});

const listMethod = computed(() => {
  return findField(selectableModules, props.module, 'listMethod', 'module') || 'list';
});

const i18nTitle = computed(() => findField(selectableModules, props.module, 'i18nTitle', 'module'));

const selectedIdSet = computed(() => new Set(state.selectedItems.map(i => i.id)));
const selectedOnPageCount = computed(() => state.items.filter(item => selectedIdSet.value.has(item.id)).length);
const isAllSelectedOnPage = computed(() => state.items.length > 0 && selectedOnPageCount.value === state.items.length);
const isAllSelectIndeterminate = computed(() => state.selectedItems.length > 0 && !isAllSelectedOnPage.value);
const isSelectionLimitReached = computed(() => props.maxSelectedItems > 0 && state.selectedItems.length >= props.maxSelectedItems);
const disabledIdMap = computed(() => {
  return state.items.reduce((acc, item) => {
    const isDisabledByCondition = props.disableCondition
      ? conditionUtils.evaluate(item, props.disableCondition)
      : false;
    const isDisabledBySelectionLimit = isSelectionLimitReached.value && !selectedIdSet.value.has(item.id);
    acc[item.id] = isDisabledByCondition || isDisabledBySelectionLimit;
    return acc;
  }, {});
});

const refresh = () => {
  page.value = ListConstant.DefaultParams.PAGE;
  fetchItems(page.value);
};

const openCreateDialog = () => {
  dialogRef.value?.open();
};

const createItem = async (item) => {
  const createMethod = findField(selectableModules, props.module, 'createMethod', 'module') || 'create';
  const { error } = await server[props.module][createMethod](item);
  if (error.value) {
    throw new Error(error.value); // Keep the modal open
  }
  snackbarStore.setActionSuccess('__actionCreate');
  refresh();
};

const handleSelect = (items) => {
  state.selectedItems = items;
};

const handleAllSelect = (items) => {
  state.selectedItems = items;
};

const resolveItemsWithPinned = async (items, pageValue) => {
  if (!props.selectedId) return items;

  const requestParam = findField(selectableModules, props.module, 'id', 'module');
  const getMethod = findField(selectableModules, props.module, 'getMethod', 'module') || 'get';
  if (!requestParam || !getMethod) return items;

  if (pageValue !== 1) return items.filter(item => item.id !== props.selectedId);

  const pinnedInPage = items.find(item => item.id === props.selectedId);
  const rest = items.filter(item => item.id !== props.selectedId);

  if (pinnedInPage) return [pinnedInPage, ...rest];

  const { data } = await server[props.module][getMethod]({ [requestParam]: props.selectedId }, { lazy: false });
  return data.value ? [data.value, ...rest] : rest;
};

const fetchItems = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  state.isLoading = true;
  state.items = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server[props.module][listMethod.value]({
    nextToken,
    limit: props.selectedId && pageValue === 1 ? perPage.value - 1 : perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filterLogic: props.filterLogic,
    filters: props.filters,
    query: query.value,
  }, {
    lazy: false,
  });
  if (error.value) {
    state.isLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;

  state.items = await resolveItemsWithPinned(data.value.data, pageValue);

  page.value = pageValue;
  state.isLoading = false;
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchItems(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchItems();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchItems();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchItems();
};

fetchItems(page.value);

watch(() => props.restoredObjects, (after) => {
  state.selectedItems = after ? [...after] : [];
});
</script>

<template>
  <AppTable
    :headers="props.headers"
    :icon="icon"
    :items="state.isLoading ? [] : state.items"
    :loading="state.isLoading"
    :selected-id="props.selectedId"
    :selected-ids="props.selectedIds"
    :disabled-id-map="disabledIdMap"
    :disabled-tooltip="props.disabledTooltip"
    :title="props.title"
    :enable-url-params="false"
    :multiple-select="props.multipleSelect"
    :restored-objects="props.restoredObjects"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :per-page-options="props.perPageOptions"
    :next-token-map="nextTokenMap"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-select="handleSelect"
    :on-all-select="handleAllSelect"
    :is-all-select-indeterminate="isAllSelectIndeterminate"
    hide-details
    is-row-selectable
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="refresh"
      />
      <AppDialog
        v-if="props.formComponent && props.allowCreate"
        ref="dialogRef"
        :on-submit="createItem"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            v-if="props.formComponent && props.allowCreate"
            icon="mdi-plus"
            class="primary-gradient"
            :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t(i18nTitle) })"
            :on-click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <component
            :is="props.formComponent"
            :on-submit="onSubmit"
            :on-discard="onCancel"
            :hidden-fields="props.hiddenFields"
          />
        </template>
      </AppDialog>
    </template>
    <template #title-actions>
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        color="actionButton"
        @click="props.onCancel"
      />
      <AppButton
        :aria-label="$t('__actionSave')"
        :text="$t('__actionSave')"
        color="primary"
        :width="100"
        @click="props.onSubmit(state.selectedItems)"
      />
    </template>
    <template #no-data>
      <ResourceInitCard
        :icon="findField(ResourceConstant.Type, props.module, 'icon')"
        :resource-label="props.fieldName"
        :title="props.title"
        :instruction="props.instruction"
        :on-click="openCreateDialog"
      >
        <template
          v-if="!(props.formComponent && props.allowCreate)"
          #actions
        />
      </ResourceInitCard>
    </template>
  </AppTable>
</template>

<style lang="scss" scoped>
@use '@/assets/vuetify.scss';

:deep() {
  .v-table {
    // 100dvh - dialog margin - card title - divider - card title - divider
    max-height: calc(100dvh - 48px - 72px - 1px - 80px - 1px);
    overflow-y: auto;
    .v-table__wrapper {
      @extend %persistent-scrollbar;
    }
  }
}
</style>

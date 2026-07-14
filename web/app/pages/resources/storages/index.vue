<script setup>
import { ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.STORAGE.value,
  filterField: ResourceConstant.Type.STORAGE.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  storages: [],
  isLoading: false,
});

const fetchStorages = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.storages = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.storage.list({
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value,
    filterLogic: filterLogic.value,
    query: query.value,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.isLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;
  state.storages = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.storages.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchStorages(page.value);
  }
};

initUrlParams();
fetchStorages(page.value);

const handleDelete = async ({ storageId }) => {
  const { error } = await server.storage.destroy({ storageId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchStorages(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchStorages(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchStorages();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchStorages();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.storage.duplicate({
    storageId: item.id,
    newStorageName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchStorages();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchStorages();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchStorages();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldStorage', 2)"
    :icon="ResourceConstant.Type.STORAGE.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'storage_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.storages"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :category="category"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :query="query"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldName'), field: 'storage_name' },
      { title: $t('__fieldId'), field: 'storage_id' },
      { title: $t('__fieldStatus'), field: 'status', values: Object.values(StatusConstant.Resource).map(item => ({ ...item, title: $t(item.i18nTitle) })) },
    ]"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
    :on-category-change="handleCategoryChange"
    enable-add-to-favorite
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchStorages(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldStorage') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.STORAGE.module"
          :persistent="isHovering"
          :item-label="$t('__fieldStorage')"
          :allow-delete-recursively="ResourceConstant.Type.STORAGE.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchStorages(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.STORAGE.icon"
        :resource-label="$t('__fieldStorage')"
        :instruction="$t('__instructionResourceStorage')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

<script setup>
import { ListConstant, RankerConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.RANKER.value,
  filterField: ResourceConstant.Type.RANKER.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  rankers: [],
  isLoading: false,
});

const fetchRankers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.rankers = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.ranker.list({
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
  state.rankers = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.rankers.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchRankers(page.value);
  }
};

initUrlParams();
fetchRankers(page.value);

const handleDelete = async ({ rankerId }) => {
  const { error } = await server.ranker.destroy({ rankerId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchRankers(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchRankers(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchRankers();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchRankers();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.ranker.duplicate({
    rankerId: item.id,
    newRankerName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchRankers();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchRankers();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchRankers();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldRanker', 2)"
    :icon="ResourceConstant.Type.RANKER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'ranker_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(RankerConstant.Type, item.type, 'title'), iconPath: item => findField(RankerConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :resource-label="$t('__fieldRanker')"
    :items="state.isLoading ? [] : state.rankers"
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
      { title: $t('__fieldName'), field: 'ranker_name' },
      { title: $t('__fieldId'), field: 'ranker_id' },
      { title: $t('__fieldType'), field: 'ranker_type', values: Object.values(RankerConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchRankers(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldRanker') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RANKER.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :module="ResourceConstant.Type.RANKER.module"
        :persistent="isHovering"
        :item-label="$t('__fieldRanker')"
        :allow-delete-recursively="ResourceConstant.Type.RANKER.allowDeleteRecursively"
        :on-delete="handleDelete"
        :on-duplicate="handleDuplicate"
        :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, item.id)}/edit`)"
        :on-resources-fetch="() => fetchRankers(page)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.RANKER.icon"
        :resource-label="$t('__fieldRanker')"
        :instruction="$t('__instructionResourceRanker')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RANKER.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

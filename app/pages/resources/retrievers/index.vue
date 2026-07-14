<script setup>
import { ListConstant, ResourceConstant, RetrieverConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.RETRIEVER.value,
  filterField: ResourceConstant.Type.RETRIEVER.favoriteFilterField,
});
const { isRetrieverDisabled } = useFeature();
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  retrievers: [],
  isLoading: false,
});

const fetchRetrievers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.retrievers = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.retriever.list({
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
  state.retrievers = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.retrievers.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchRetrievers(page.value);
  }
};

initUrlParams();
fetchRetrievers(page.value);

const handleDelete = async ({ retrieverId }) => {
  const { error } = await server.retriever.destroy({ retrieverId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchRetrievers(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchRetrievers(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchRetrievers();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchRetrievers();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.retriever.duplicate({
    retrieverId: item.id,
    newRetrieverName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchRetrievers();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchRetrievers();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchRetrievers();
};
</script>

<template>
  <AppNotEnabledCard
    v-if="!state.isLoading && isRetrieverDisabled"
    :icon="ResourceConstant.Type.RETRIEVER.icon"
    :i18n-item="$t('__fieldRetriever')"
    :instruction="$t('__instructionResourceRetriever')"
  />
  <AppTable
    v-else
    :title="$t('__fieldRetriever', 2)"
    :icon="ResourceConstant.Type.RETRIEVER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'retriever_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(RetrieverConstant.Type, item.type, 'title'), iconPath: item => findField(RetrieverConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.retrievers"
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
      { title: $t('__fieldName'), field: 'retriever_name' },
      { title: $t('__fieldId'), field: 'retriever_id' },
      { title: $t('__fieldType'), field: 'retriever_type', values: Object.values(RetrieverConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchRetrievers(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldRetriever') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.RETRIEVER.module"
          :persistent="isHovering"
          :item-label="$t('__fieldRetriever')"
          :allow-delete-recursively="ResourceConstant.Type.RETRIEVER.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchRetrievers(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.RETRIEVER.icon"
        :resource-label="$t('__fieldRetriever')"
        :instruction="$t('__instructionResourceRetriever')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

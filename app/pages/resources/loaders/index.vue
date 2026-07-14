<script setup>
import { ListConstant, LoaderConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.LOADER.value,
  filterField: ResourceConstant.Type.LOADER.favoriteFilterField,
});
const { isLoaderDisabled } = useFeature();
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  loaders: [],
  isLoading: false,
});

const fetchLoaders = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.loaders = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.loader.list({
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
  state.loaders = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.loaders.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchLoaders(page.value);
  }
};

initUrlParams();
fetchLoaders(page.value);

const handleDelete = async ({ loaderId }) => {
  const { error } = await server.loader.destroy({ loaderId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchLoaders(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchLoaders(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchLoaders();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchLoaders();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.loader.duplicate({
    loaderId: item.id,
    knowledgeBaseId: formData.knowledgeBaseId,
    newLoaderName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchLoaders();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchLoaders();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchLoaders();
};
</script>

<template>
  <AppNotEnabledCard
    v-if="!state.isLoading && isLoaderDisabled"
    :icon="ResourceConstant.Type.LOADER.icon"
    :i18n-item="$t('__fieldLoader')"
    :instruction="$t('__instructionResourceLoader')"
  />
  <AppTable
    v-else
    :title="$t('__fieldLoader', 2)"
    :icon="ResourceConstant.Type.LOADER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'loader_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => $t(findField(LoaderConstant.Type, item.type, 'i18nTitle')), iconPath: item => findField(LoaderConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.loaders"
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
      { title: $t('__fieldName'), field: 'loader_name' },
      { title: $t('__fieldId'), field: 'loader_id' },
      { title: $t('__fieldType'), field: 'loader_type', values: Object.values(LoaderConstant.Type).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchLoaders(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldLoader') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.LOADER.module"
          :persistent="isHovering"
          :item-label="$t('__fieldLoader')"
          :allow-delete-recursively="ResourceConstant.Type.LOADER.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchLoaders(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.LOADER.icon"
        :resource-label="$t('__fieldLoader')"
        :instruction="$t('__instructionResourceLoader')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

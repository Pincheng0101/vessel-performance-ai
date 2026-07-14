<script setup>
import { EmbeddingModelConstant, ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.EMBEDDING_MODEL.value,
  filterField: ResourceConstant.Type.EMBEDDING_MODEL.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  embeddingModels: [],
  isLoading: false,
});

const fetchEmbeddingModels = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.embeddingModels = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.embeddingModel.list({
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
  state.embeddingModels = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.embeddingModels.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchEmbeddingModels(page.value);
  }
};

initUrlParams();
fetchEmbeddingModels(page.value);

const handleDelete = async ({ embeddingModelId }) => {
  const { error } = await server.embeddingModel.destroy({ embeddingModelId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchEmbeddingModels(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchEmbeddingModels(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchEmbeddingModels();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchEmbeddingModels();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.embeddingModel.duplicate({
    embeddingModelId: item.id,
    newEmbeddingModelName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchEmbeddingModels();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchEmbeddingModels();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchEmbeddingModels();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldEmbeddingModel', 2)"
    :icon="ResourceConstant.Type.EMBEDDING_MODEL.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'embedding_model_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(EmbeddingModelConstant.Type, item.type, 'title'), iconPath: item => findField(EmbeddingModelConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.embeddingModels"
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
      { title: $t('__fieldName'), field: 'embedding_model_name' },
      { title: $t('__fieldId'), field: 'embedding_model_id' },
      { title: $t('__fieldType'), field: 'embedding_model_type', values: Object.values(EmbeddingModelConstant.Type) },
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
        @click="fetchEmbeddingModels(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldEmbeddingModel') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :module="ResourceConstant.Type.EMBEDDING_MODEL.module"
        :persistent="isHovering"
        :item-label="$t('__fieldEmbeddingModel')"
        :allow-delete-recursively="ResourceConstant.Type.EMBEDDING_MODEL.allowDeleteRecursively"
        :on-delete="handleDelete"
        :on-duplicate="handleDuplicate"
        :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, item.id)}/edit`)"
        :on-resources-fetch="() => fetchEmbeddingModels(page)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.EMBEDDING_MODEL.icon"
        :resource-label="$t('__fieldEmbeddingModel')"
        :instruction="$t('__instructionResourceEmbeddingModel')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

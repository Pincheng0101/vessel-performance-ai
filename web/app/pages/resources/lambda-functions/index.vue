<script setup>
import { ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.LAMBDA_FUNCTION.value,
  filterField: ResourceConstant.Type.LAMBDA_FUNCTION.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  isLoading: false,
  lambdaFunctions: [],
});

const fetchLambdaFunctions = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.lambdaFunctions = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.lambdaFunction.list({
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
  state.lambdaFunctions = data.value.data;
  page.value = pageValue;
  state.isLoading = false;

  if (state.lambdaFunctions.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchLambdaFunctions(page.value);
  }
};

initUrlParams();
fetchLambdaFunctions(page.value);

const handleDelete = async ({ lambdaFunctionId }) => {
  const { error } = await server.lambdaFunction.destroy({ lambdaFunctionId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchLambdaFunctions(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchLambdaFunctions(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchLambdaFunctions();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchLambdaFunctions();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.lambdaFunction.duplicate({
    lambdaFunctionId: item.id,
    newLambdaFunctionName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchLambdaFunctions();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchLambdaFunctions();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchLambdaFunctions();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldLambdaFunction', 2)"
    :icon="ResourceConstant.Type.LAMBDA_FUNCTION.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'lambda_function_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.lambdaFunctions"
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
      { title: $t('__fieldName'), field: 'lambda_function_name' },
      { title: $t('__fieldId'), field: 'lambda_function_id' },
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
        @click="fetchLambdaFunctions(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldLambdaFunction') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.LAMBDA_FUNCTION.module"
          :persistent="isHovering"
          :item-label="$t('__fieldLambdaFunction')"
          :allow-delete-recursively="ResourceConstant.Type.LAMBDA_FUNCTION.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchLambdaFunctions(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.LAMBDA_FUNCTION.icon"
        :resource-label="$t('__fieldLambdaFunction')"
        :instruction="$t('__instructionResourceLambdaFunction')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

<script setup>
import { ListConstant, ResourceConstant, StatusConstant, VariableConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.VARIABLE.value,
  filterField: ResourceConstant.Type.VARIABLE.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  variables: [],
  isLoading: false,
});

const fetchVariables = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.variables = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.variable.list({
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
  state.variables = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.variables.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchVariables(page.value);
  }
};

initUrlParams();
fetchVariables(page.value);

const handleDelete = async ({ variableId }) => {
  const { error } = await server.variable.destroy({ variableId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchVariables(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchVariables(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchVariables();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchVariables();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.variable.duplicate({
    variableId: item.id,
    newVariableName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchVariables();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchVariables();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchVariables();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldVariable', 2)"
    :icon="ResourceConstant.Type.VARIABLE.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'variable_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(VariableConstant.Type, item.type, 'title'), iconPath: item => findField(VariableConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.variables"
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
      { title: $t('__fieldName'), field: 'variable_name' },
      { title: $t('__fieldId'), field: 'variable_id' },
      { title: $t('__fieldType'), field: 'variable_type', values: Object.values(VariableConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchVariables(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldVariable') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.VARIABLE.module"
          :persistent="isHovering"
          :item-label="$t('__fieldVariable')"
          :allow-delete-recursively="ResourceConstant.Type.VARIABLE.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchVariables(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.VARIABLE.icon"
        :resource-label="$t('__fieldVariable')"
        :instruction="$t('__instructionResourceVariable')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

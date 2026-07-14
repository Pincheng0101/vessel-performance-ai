<script setup>
import { KnowledgeBaseConstant, ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.KNOWLEDGE_BASE.value,
  filterField: ResourceConstant.Type.KNOWLEDGE_BASE.favoriteFilterField,
});
const { isKnowledgeBaseDisabled } = useFeature();
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  knowledgeBases: [],
  isLoading: false,
});

const fetchKnowledgeBases = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.knowledgeBases = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.knowledgeBase.list({
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
  state.knowledgeBases = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.knowledgeBases.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchKnowledgeBases(page.value);
  }
};

initUrlParams();
fetchKnowledgeBases(page.value);

const handleDelete = async ({ knowledgeBaseId }) => {
  const { error } = await server.knowledgeBase.destroy({ knowledgeBaseId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchKnowledgeBases(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchKnowledgeBases(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchKnowledgeBases();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchKnowledgeBases();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.knowledgeBase.duplicate({
    knowledgeBaseId: item.id,
    newKnowledgeBaseName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchKnowledgeBases();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchKnowledgeBases();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchKnowledgeBases();
};
</script>

<template>
  <AppNotEnabledCard
    v-if="!state.isLoading && isKnowledgeBaseDisabled"
    :icon="ResourceConstant.Type.KNOWLEDGE_BASE.icon"
    :i18n-item="$t('__fieldKnowledgeBase')"
    :instruction="$t('__instructionResourceKnowledgeBase')"
  />
  <AppTable
    v-else
    :title="$t('__fieldKnowledgeBase', 2)"
    :icon="ResourceConstant.Type.KNOWLEDGE_BASE.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'knowledge_base_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(KnowledgeBaseConstant.Type, item.type, 'title'), iconPath: item => findField(KnowledgeBaseConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.knowledgeBases"
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
      { title: $t('__fieldName'), field: 'knowledge_base_name' },
      { title: $t('__fieldId'), field: 'knowledge_base_id' },
      { title: $t('__fieldType'), field: 'knowledge_base_type', values: Object.values(KnowledgeBaseConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchKnowledgeBases(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldKnowledgeBase') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.KNOWLEDGE_BASE.module"
          :persistent="isHovering"
          :item-label="$t('__fieldKnowledgeBase')"
          :allow-delete-recursively="ResourceConstant.Type.KNOWLEDGE_BASE.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchKnowledgeBases(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.KNOWLEDGE_BASE.icon"
        :resource-label="$t('__fieldKnowledgeBase')"
        :instruction="$t('__instructionResourceKnowledgeBase')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

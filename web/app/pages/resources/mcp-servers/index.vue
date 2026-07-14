<script setup>
import { ListConstant, McpServerConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.MCP_SERVER.value,
  filterField: ResourceConstant.Type.MCP_SERVER.favoriteFilterField,
});
const snackbarStore = useSnackbarStore();

const state = reactive({
  mcpServers: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchMcpServers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.mcpServers = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.mcpServer.list({
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
  state.mcpServers = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.mcpServers.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchMcpServers(page.value);
  }
};

initUrlParams();
fetchMcpServers(page.value);

const handleDelete = async ({ mcpServerId }) => {
  const { error } = await server.mcpServer.destroy({ mcpServerId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchMcpServers(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchMcpServers(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchMcpServers();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchMcpServers();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.mcpServer.duplicate({
    mcpServerId: item.id,
    newMcpServerName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchMcpServers();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchMcpServers();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchMcpServers();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldMcpServer', 2)"
    :icon-path="ResourceConstant.Type.MCP_SERVER.iconPath"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'mcp_server_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => { const k = findField(McpServerConstant.Type, item.type, 'i18nTitle'); return k ? $t(k) : item.type; }, iconPath: item => findField(McpServerConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.mcpServers"
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
      { title: $t('__fieldName'), field: 'mcp_server_name' },
      { title: $t('__fieldId'), field: 'mcp_server_id' },
      { title: $t('__fieldType'), field: 'mcp_server_type', values: Object.values(McpServerConstant.Type).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchMcpServers(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldMcpServer') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.MCP_SERVER.module"
          :persistent="isHovering"
          :item-label="$t('__fieldMcpServer')"
          :allow-delete-recursively="ResourceConstant.Type.MCP_SERVER.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchMcpServers(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon-path="ResourceConstant.Type.MCP_SERVER.iconPath"
        :resource-label="$t('__fieldMcpServer')"
        :instruction="$t('__instructionResourceMcpServer')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

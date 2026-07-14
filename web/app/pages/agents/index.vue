<script setup>
import { ListConstant, ResourceConstant, StatusConstant } from '~/constants';
import { UiData } from '~/models/server/uiData';
import { AgentMetadata } from '~/models/ui/agent';

// Per-page options are restricted to comply with the batch-get-ui-data API limit of 100 items per request
const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const snackbarStore = useSnackbarStore();
const server = useServer();
const { openInNewTab } = useNavigation();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.AGENT.value,
  filterField: ResourceConstant.Type.AGENT.favoriteFilterField,
  perPageOptions: PER_PAGE_OPTIONS,
});

const state = reactive({
  agents: [],
  /**
   * @type {Record<string, AgentMetadata>}
   */
  agentMetadataMap: {},
  isLoading: false,
  focusedRowIndex: null,
});

const { createSignal } = useAbortController();

const fetchAgents = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.agents = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.agent.list({
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
  state.agents = data.value.data;
  state.agentMetadataMap = {};
  const uiDataKeys = state.agents.map(item => AgentMetadata.getUiDataKey(item.id));
  if (uiDataKeys.length > 0) {
    const { data: uiData, error: uiDataError } = await server.uiData.batchGet({ keys: uiDataKeys }, { lazy: false });
    if (!uiDataError.value) {
      for (const item of uiData.value.data) {
        const agentId = item.key.replace(/^metadata-/, '');
        state.agentMetadataMap[agentId] = new AgentMetadata(item.value);
      }
    }
  }
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.agents.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchAgents(page.value);
  }
};

initUrlParams();
fetchAgents(page.value);

const handleDelete = async ({ agentId }) => {
  const { error } = await server.agent.destroy({ agentId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchAgents(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchAgents(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchAgents();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchAgents();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.agent.duplicate({
    agentId: item.id,
    newAgentName: formData.name,
  });
  if (error.value) {
    return;
  }
  const sourceMetadata = state.agentMetadataMap[item.id];
  if (sourceMetadata) {
    const { error: uiDataError } = await server.uiData.set(new UiData({
      key: AgentMetadata.getUiDataKey(data.value.id),
      value: new AgentMetadata(sourceMetadata),
    }));
    if (uiDataError.value) {
      return;
    }
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`agents/${data.value.id}`);
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchAgents();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchAgents();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchAgents();
};

const isCreatedFromAgentBuilder = agentId => state.agentMetadataMap[agentId]?.isCreatedFromAgentBuilder;
</script>

<template>
  <AppTable
    :title="$t('__fieldAgent', 2)"
    :icon="ResourceConstant.Type.AGENT.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'agent_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.agents"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :category="category"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :per-page-options="PER_PAGE_OPTIONS"
    :query="query"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldName'), field: 'agent_name' },
      { title: $t('__fieldId'), field: 'agent_id' },
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
        @click="fetchAgents(page)"
      />
      <ResourceAgentHeaderMenu />
    </template>
    <template #row-menu="{ index, item, isHovering }">
      <template v-if="isHovering || state.focusedRowIndex === index">
        <AppButton
          :height="32"
          :text="$t('__actionGoToChat')"
          append-icon="mdi-open-in-new"
          variant="flat"
          class="primary-gradient"
          @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.id)}/chat`)"
        />
      </template>
      <ResourceActionMenu
        :item="item"
        :module="ResourceConstant.Type.AGENT.module"
        :persistent="isHovering"
        :item-label="$t('__fieldAgent')"
        :allow-delete-recursively="ResourceConstant.Type.AGENT.allowDeleteRecursively"
        :on-delete="handleDelete"
        :on-duplicate="handleDuplicate"
        :on-edit="isCreatedFromAgentBuilder(item.id) ? (item => navigateTo(`/quick-start/agents/${item.id}/edit`)) : (item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.id)}/edit`))"
        :on-resources-fetch="() => fetchAgents(page)"
        :on-usage-analysis-open="item => navigateTo(`/usage/agents/${item.id}`)"
        @update:model-value="(v) => {
          state.focusedRowIndex = v ? index : null;
        }"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.AGENT.icon"
        :resource-label="$t('__fieldAgent')"
        :instruction="$t('__instructionResourceAgent')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

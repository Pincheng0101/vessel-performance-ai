<script setup>
import { IconConstant, ListConstant, ResourceConstant, StateConstant, StatusConstant, WorkflowConstant } from '~/constants';
import { UiData, WorkflowDraftValue } from '~/models/server/uiData';
import { WorkflowDefinition } from '~/models/workflow/state';

const snackbarStore = useSnackbarStore();
const server = useServer();
const dayjs = useDayjs();
const { openInNewTab } = useNavigation();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.WORKFLOW.value,
  filterField: ResourceConstant.Type.WORKFLOW.favoriteFilterField,
});
const { importWorkflowDefinition } = useWorkflowTemplate();

const state = reactive({
  blankWorkflow: {
    workflowName: WorkflowConstant.DefaultWorkflowName,
    definition: new WorkflowDefinition({
      startAt: StateConstant.InitialWorkflowStates[0].name,
      states: StateConstant.InitialWorkflowStates,
    }),
  },
  workflows: [],
  isLoading: false,
  focusedRowIndex: null,
});

const { createSignal } = useAbortController();

const fetchWorkflows = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  state.workflows = [];
  updateFiltersByCategory();
  const { data, error } = await server.workflow.list({
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
  page.value = pageValue;
  state.workflows = data.value.data;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.workflows.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchWorkflows(page.value);
  }
};

initUrlParams();
fetchWorkflows(page.value);

const createBlankWorkflow = async (formData) => {
  state.blankWorkflow.workflowName = formData.workflowName;
  state.blankWorkflow.definition.comment = formData.definition.comment;
  state.blankWorkflow.definition = WorkflowDefinition.toAsl(formData.definition);

  const { data, error } = await server.workflow.create(state.blankWorkflow);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, data.value.id)}/edit`);
};

const handleDelete = async ({ workflowId }) => {
  const { error } = await server.workflow.destroy({ workflowId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchWorkflows(page.value);
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.workflow.duplicate({
    workflowId: item.workflowId,
    newWorkflowName: formData.name,
  });
  if (error.value) {
    return;
  }
  const { data: draftData } = await server.uiData.get({
    key: `draft-${item.workflowId}`,
  });
  if (draftData.value) {
    await server.uiData.set(new UiData({
      key: `draft-${data.value.id}`,
      value: new WorkflowDraftValue({
        ...draftData.value.value,
        updatedTs: dayjs().unix(),
      }),
    }));
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, data.value.id));
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchWorkflows(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchWorkflows();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchWorkflows();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchWorkflows();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchWorkflows();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchWorkflows();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldWorkflow', 2)"
    :icon="IconConstant.Base.WORKFLOW"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'workflow_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.workflows"
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
    :filter-logic="filterLogic"
    :filter-options="[
      { title: $t('__fieldName'), field: 'workflow_name' },
      { title: $t('__fieldId'), field: 'workflow_id' },
      { title: $t('__fieldStatus'), field: 'status', values: Object.values(StatusConstant.Resource).map(item => ({ ...item, title: $t(item.i18nTitle) })) },
    ]"
    :on-page-change="handlePageChange"
    :on-sort-by-change="handleSortByChange"
    :on-per-page-change="handlePerPageChange"
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
        @click="fetchWorkflows(page)"
      />
      <WorkflowHeaderMenu
        :blank-workflow="state.blankWorkflow"
        :on-blank-workflow-create="createBlankWorkflow"
        :on-workflow-definition-import="importWorkflowDefinition"
      />
    </template>
    <template #row-menu="{ index, item, isHovering }">
      <template v-if="isHovering || state.focusedRowIndex === index">
        <AppButton
          :height="32"
          :text="$t('__actionRunApp')"
          append-icon="mdi-open-in-new"
          variant="flat"
          class="primary-gradient"
          @click="openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.id)}/execute`)"
        />
      </template>
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldWorkflow')"
        :allow-delete-recursively="ResourceConstant.Type.WORKFLOW.allowDeleteRecursively"
        :on-delete="handleDelete"
        :on-duplicate="handleDuplicate"
        :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.id)}/edit`)"
        :on-resources-fetch="() => fetchWorkflows(page)"
        :on-usage-analysis-open="() => navigateTo('/usage/workflows')"
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
        :icon="IconConstant.Base.WORKFLOW"
        :resource-label="$t('__fieldWorkflow')"
        :instruction="$t('__instructionWorkflow')"
      >
        <template #actions>
          <WorkflowHeaderMenu
            :blank-workflow="state.blankWorkflow"
            :on-blank-workflow-create="createBlankWorkflow"
            :on-workflow-definition-import="importWorkflowDefinition"
            with-text
          />
        </template>
      </ResourceInitCard>
    </template>
  </AppTable>
</template>

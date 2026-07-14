<script setup>
import { ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.SKILL.value,
  filterField: ResourceConstant.Type.SKILL.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  isLoading: false,
  skills: [],
});

const fetchSkills = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.skills = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.skill.list({
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
  state.skills = data.value.data;
  page.value = pageValue;
  state.isLoading = false;

  if (state.skills.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchSkills(page.value);
  }
};

initUrlParams();
fetchSkills(page.value);

const handleDelete = async ({ skillId }) => {
  const { error } = await server.skill.destroy({ skillId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchSkills(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchSkills(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchSkills();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchSkills();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.skill.duplicate({
    skillId: item.id,
    newSkillName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchSkills();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchSkills();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchSkills();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldSkill', 2)"
    :icon="ResourceConstant.Type.SKILL.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'skill_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldDescription'), key: 'description' },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.skills"
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
      { title: $t('__fieldName'), field: 'skill_name' },
      { title: $t('__fieldId'), field: 'skill_id' },
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
        @click="fetchSkills(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldSkill') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SKILL.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.SKILL.module"
          :persistent="isHovering"
          :item-label="$t('__fieldSkill')"
          :allow-delete-recursively="ResourceConstant.Type.SKILL.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchSkills(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.SKILL.icon"
        :resource-label="$t('__fieldSkill')"
        :instruction="$t('__instructionResourceSkill')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SKILL.value)}/create`)"
      />
    </template>
  </AppTable>
</template>

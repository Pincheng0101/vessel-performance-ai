<script setup>
import { RuntimeConstant } from '~/constants';

/**
 * @import { Storage } from '~/models/server/storage'
 */

const server = useServer();
const { sortField, sortOrder, query } = usePagination();

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: Object,
    default: null,
  },
  commonPrefix: {
    type: String,
    default: '',
  },
  disabledIdMap: {
    type: Object,
    default: () => ({}),
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  selectedId: {
    type: String,
    default: null,
  },
  submitButtonText: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  items: [],
  isLoading: false,
  disabledIdMap: {},
  commonPrefix: '',
  refreshMenu: 0,
  selectedFolder: null,
});

const initializeState = () => {
  if (!props.commonPrefix && !props.selectedId) return;
  state.commonPrefix = props.commonPrefix;
};

const refresh = () => {
  fetchItems();
};

const handleFolderSelect = (item) => {
  state.commonPrefix = item.commonPrefix.replace(/\/$/, '');
  state.refreshMenu += 1;
  fetchItems();
};

const fetchItems = async () => {
  if (!props.storage) return;
  state.isLoading = true;
  state.items = [];
  let nextToken = null;
  do {
    const { data, error } = await server.storageObject.list({
      storageId: props.storage.storageId,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      query: query.value,
      prefix: state.commonPrefix ? `${pathUtils.appendTrailingSlash(state.commonPrefix)}` : '',
      nextToken,
    }, {
      lazy: false,
    });
    if (error.value) {
      state.isLoading = false;
      return;
    }
    if (!data.value.commonPrefixes || data.value.commonPrefixes.length === 0) {
      break;
    }
    state.items.push(...data.value.commonPrefixes.toReversed());
    nextToken = data.value.nextToken;
  } while (nextToken);
  state.isLoading = false;
  state.selectedFolder = null;
};

const handlePageChange = (pageValue) => {
  fetchItems(pageValue);
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchItems();
};

const handleFilterChange = (value) => {
  query.value = value;
  fetchItems();
};

const handleCommonPrefixCreate = () => {
  fetchItems();
};

const handleFolderSelected = (v) => {
  if (v) {
    state.selectedFolder = v.commonPrefix;
  }
};

initializeState();
fetchItems();
</script>

<template>
  <AppTable
    :server-side="false"
    :headers="[
      {
        title: $t('__fieldName'),
        key: 'name',
        icon: RuntimeConstant.Type.COMMON_PREFIX.icon,
        iconColor: 'text',
        isClickable: true,
      },
    ]"
    :items="state.isLoading ? [] : state.items"
    :loading="state.isLoading"
    :disabled-id-map="props.disabledIdMap"
    :disabled-tooltip="props.disabledTooltip"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :selected-id="state.selectedFolder || props.selectedId"
    :on-page-change="handlePageChange"
    :on-sort-by-change="handleSortByChange"
    :on-filters-change="handleFilterChange"
    :on-select="handleFolderSelected"
    :on-item-click="handleFolderSelect"
    hide-details
    is-row-selectable
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="refresh"
      />
      <ResourceStorageObjectHeaderMenu
        :key="state.refreshMenu"
        :storage-objects="state.items"
        :storage-id="props.storage?.storageId"
        :common-prefix="state.commonPrefix"
        :on-common-prefix-create="handleCommonPrefixCreate"
      />
    </template>
    <template #title>
      <div class="d-flex align-center">
        {{ props.title || $t('__titleSelectDestinationFolder') }}
      </div>
    </template>
    <template #title-actions>
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        color="actionButton"
        @click="props.onCancel"
      />
      <AppButton
        :aria-label="props.submitButtonText || $t('__actionMove')"
        :text="props.submitButtonText || $t('__actionMove')"
        color="primary"
        :disabled="(props.commonPrefix === state.commonPrefix) && !state.selectedFolder"
        :width="100"
        @click="props.onSubmit(pathUtils.appendTrailingSlash(state.selectedFolder || state.commonPrefix))"
      />
    </template>
    <template #search-top>
      <ResourceStorageObjectListBreadcrumbs
        v-model:common-prefix="state.commonPrefix"
        :storage="props.storage"
        :on-click="fetchItems"
      />
    </template>
  </AppTable>
</template>

<style lang="scss" scoped>
:deep() {
  .v-table {
    // 100dvh - dialog margin - card title - divider - card title - divider - toolbar
    max-height: calc(100dvh - 48px - 72px - 1px - 80px - 1px - 36px);
    overflow-y: auto;
  }
}
</style>

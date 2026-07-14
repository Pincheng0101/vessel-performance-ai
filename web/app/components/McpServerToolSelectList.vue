<script setup>
import { ListConstant, McpServerConstant } from '~/constants';

const server = useServer();
const { sortField, sortOrder, query } = usePagination();
const { authorize } = useMcpServerOauthTest();

const props = defineProps({
  mcpServerId: {
    type: String,
    required: true,
  },
  authType: {
    type: String,
    default: null,
  },
  endpointUrl: {
    type: String,
    default: null,
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedIds: {
    type: Array,
    default: null,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  restoredObjects: {
    type: [Array, Object],
    default: null,
  },
  items: {
    type: Array,
    default: null,
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
  selectedItems: [],
  items: [],
  isLoading: false,
  accessToken: null,
  page: ListConstant.DefaultParams.PAGE,
  perPage: ListConstant.DefaultParams.PER_PAGE,
});

const isOauthAuth = computed(() => props.authType === McpServerConstant.StreamableHttpAuthType.OAUTH.value);
const showAuthorize = computed(() => isOauthAuth.value && !state.accessToken);

if (props.restoredObjects) {
  state.selectedItems = props.restoredObjects;
}

if (props.items) {
  state.items = props.items;
}

const isAllSelectIndeterminate = computed(() => state.selectedItems.some(item => item.id));

// Update value when restored objects changed
watch(() => props.restoredObjects, (after) => {
  state.selectedItems = after;
});

const refresh = () => {
  fetchItems();
};

const fetchItems = async () => {
  state.isLoading = true;
  const { data, error } = await server.mcpServer.listTools({
    mcpServerId: props.mcpServerId,
    accessToken: state.accessToken,
  }, {
    lazy: false,
  });
  if (error.value) {
    if (isOauthAuth.value) state.accessToken = null;
    state.isLoading = false;
    return;
  }
  state.items = data.value.data;
  state.isLoading = false;
};

const handleAuthorize = async () => {
  const accessToken = await authorize(props.endpointUrl);
  if (!accessToken) return;
  state.accessToken = accessToken;
  await fetchItems();
};

const handleItemSelect = (items) => {
  state.selectedItems = items;
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

const handleSubmit = () => {
  props.onSubmit(state.selectedItems);
};

const handleAllSelect = (v) => {
  state.selectedItems = v;
};

onMounted(() => {
  if (state.items.length === 0 && !showAuthorize.value) {
    fetchItems();
  }
});
</script>

<template>
  <AppTable
    :title="$t('__titleModifyItem', { action: $t('__actionSelect'), item: $t('__fieldLlmMcpServerTool', props.multipleSelect ? 2 : 1) })"
    :icon="McpServerConstant.Base.TOOL.icon"
    :server-side="false"
    :headers="[
      { title: $t('__fieldName'), key: 'name' },
      { title: $t('__fieldDescription'), key: 'description' },
    ]"
    :enable-url-params="false"
    :is-all-select-indeterminate="props.multipleSelect ? isAllSelectIndeterminate : null"
    :items="state.isLoading ? [] : state.items"
    :loading="state.isLoading"
    :multiple-select="props.multipleSelect"
    :on-all-select="props.multipleSelect ? handleAllSelect : null"
    :on-filters-change="handleFilterChange"
    :on-select="handleItemSelect"
    :on-sort-by-change="handleSortByChange"
    :restored-objects="props.multipleSelect ? restoredObjects : null"
    :selected-id="props.selectedId"
    :selected-ids="props.multipleSelect ? state.selectedItems.map(item => item.id) : null"
    :sort-field="sortField"
    :sort-order="sortOrder"
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
    </template>
    <template #title-actions>
      <AppButton
        v-if="showAuthorize"
        :text="$t('__actionConnect')"
        color="primary"
        variant="outlined"
        :width="100"
        :on-click="handleAuthorize"
      />
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        color="actionButton"
        @click="props.onCancel"
      />
      <AppButton
        :aria-label="$t('__actionSave')"
        :text="$t('__actionSave')"
        color="primary"
        :width="100"
        @click="handleSubmit"
      />
    </template>
    <template
      v-if="showAuthorize"
      #no-data
    >
      <AppInfoCard
        :title="$t('__messageOauthConnectRequired')"
        icon="mdi-lock-outline"
        min-height="400"
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

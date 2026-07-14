<script setup>
import { FileExtensionConstant, ListConstant, ResourceConstant, StorageConstant } from '~/constants';

const route = useRoute();
const { t } = useI18n();
const server = useServer();
const { page, sortField, sortOrder, query } = usePagination();
const breadcrumbStore = useBreadcrumbStore();
const { createSignal: createStorageSignal } = useAbortController();
const { createSignal: createStorageObjectSignal } = useAbortController();
const { createSignal: createStorageObjectListSignal } = useAbortController();
const { createSignal: createStorageObjectPreviewSignal } = useAbortController();

const state = reactive({
  storage: null,
  storageObject: null,
  storageObjectPreview: null,
  storageObjects: [],
  storageError: null,
  storageObjectError: null,
  storageObjectPreviewError: null,
  isLoading: false,
  isLoadingPreview: false,
  commonPrefix: decodeURIComponent(pathUtils.extractAfter(route.path, 'files/')),
});

breadcrumbStore.setLoading(true);

const isRootFolder = computed(() => route.path.endsWith('/files'));
const PREVIEWABLE_FILE_TYPES = [
  FileExtensionConstant.Base.CSV,
  FileExtensionConstant.Base.JSONL,
];
const PREVIEWABLE_CONTENT_TYPES = new Set(PREVIEWABLE_FILE_TYPES.map(type => type.mediaType));
const PREVIEWABLE_EXTENSIONS = new Set(PREVIEWABLE_FILE_TYPES.map(type => type.value));

const isStorageObjectPreviewable = computed(() => {
  if (!state.storageObject) return false;
  const contentType = state.storageObject.contentType?.split(';').at(0)?.toLowerCase();
  return PREVIEWABLE_CONTENT_TYPES.has(contentType) || PREVIEWABLE_EXTENSIONS.has(pathUtils.getFileExtension(state.storageObject.objectPath));
});

const fetchStorage = async () => {
  const signal = createStorageSignal();

  state.isLoading = true;
  const { data, error } = await server.storage.get({
    storageId: route.params.id,
  }, {
    lazy: false,
    signal,
    onResponse: ({ _data }) => {
      breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
      breadcrumbStore.setLoading(false);
    },
  });
  if (signal.aborted) return;

  if (error.value) {
    state.storageError = error.value;
    state.isLoading = false;
    return;
  }
  state.storage = data;
  state.isLoading = false;
};

const fetchStorageObject = async () => {
  const signal = createStorageObjectSignal();

  state.isLoading = true;
  const { data, error } = await server.storageObject.get({ storageId: route.params.id, objectPath: state.commonPrefix }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.storageObjectError = error.value.data;
    state.isLoading = false;
    return;
  }
  state.storageObject = data;
  state.isLoading = false;
};

const fetchStorageObjectPreview = async () => {
  state.storageObjectPreview = null;
  state.storageObjectPreviewError = null;
  state.isLoadingPreview = false;
  if (!isStorageObjectPreviewable.value) return;

  const signal = createStorageObjectPreviewSignal();

  state.isLoadingPreview = true;
  const { data, error } = await server.storageObject.preview({
    storageId: route.params.id,
    objectPath: state.commonPrefix,
    limit: ListConstant.StorageObjectParams.PREVIEW_CONTENT_LIMIT,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.storageObjectPreviewError = error.value.data;
    state.isLoadingPreview = false;
    return;
  }
  state.storageObjectPreview = data;
  state.isLoadingPreview = false;
};

const fetchStorageObjects = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createStorageObjectListSignal();

  state.storageObjects = [];
  const { data, error } = await server.storageObject.list({
    storageId: route.params.id,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    query: query.value,
    prefix: state.commonPrefix ? `${pathUtils.extractDirectory(state.commonPrefix, '/')}` : '',
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    return;
  }
  state.storageObjects = data.value.data.filter(item => pathUtils.extractLast(item.objectPath) !== StorageConstant.PLACEHOLDER_OBJECT_NAME);
  page.value = pageValue;
};

const init = () => {
  if (route.query.file) {
    fetchStorageObject().then(fetchStorageObjectPreview);
    fetchStorageObjects();
  }
  fetchStorage();
};

watch(() => route.query.file, async (after) => {
  if (after) {
    await fetchStorageObject();
    await fetchStorageObjectPreview();
    await fetchStorageObjects();
    scrollUtils.scrollTo();
    return;
  }
  state.storageObject = null;
  state.storageObjectPreview = null;
  state.storageObjectPreviewError = null;
  await fetchStorage();
});

init();
</script>

<template>
  <template v-if="state.isLoading">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="state.storageObject">
      <ResourceInfoTitle :title="state.storageObject.name" />
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
        ]"
      >
        <template #general>
          <ResourceStorageObjectDetailsCard
            :storage="state.storage"
            :item="state.storageObject"
            :used-names="state.storageObjects?.map(v => v.name)"
            :on-move="commonPrefix => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id)}/files/${commonPrefix}${pathUtils.extractLast(state.storageObject.objectPath)}?file=true`)"
          />
          <AppDetailsCard
            v-if="isStorageObjectPreviewable"
            :title="$t('__titleFilePreview')"
            icon="mdi-table-eye"
            class="mt-6"
            card-text-class="pa-0"
          >
            <template #body>
              <div class="pa-4">
                <ResourceStorageObjectPreviewCard
                  :preview="state.storageObjectPreview"
                  :loading="state.isLoadingPreview"
                  :error="state.storageObjectPreviewError"
                />
              </div>
            </template>
          </AppDetailsCard>
        </template>
      </AppTabs>
    </template>
    <template v-else-if="state.storageObjectError">
      <ResourceErrorCard
        :label="$t('__fieldFile')"
        :status-code="state.storageObjectError.status"
      />
    </template>
    <template v-else-if="state.storage">
      <ResourceInfoTitle :title="route.params.folders?.length > 0 ? `${route.params.folders.at(-1)}/` : state.storage.name" />
      <AppTabs
        :items="[
          { title: t('__titleGeneral'), to: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id) },
          { title: t('__fieldFile', 2), to: state.commonPrefix ? `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id)}/files/${state.commonPrefix}` : `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id)}/files`, active: true },
          { title: t('__titleDependency', 2), to: `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id)}?tab=dependencies`, isHidden: !isRootFolder },
          { title: t('__titleDependent', 2), to: `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, state.storage.id)}?tab=dependents`, isHidden: !isRootFolder },
        ]"
      />
      <template v-if="route.query.tab === 'dependencies'">
        <ResourceDependencyList
          :type="ResourceConstant.DependencyType.DEPENDENCY.value"
          :resource-id="state.storage.id"
          :resource-type="ResourceConstant.Type.STORAGE.value"
        />
      </template>
      <template v-else-if="route.query.tab === 'dependents'">
        <ResourceDependencyList
          :resource-id="state.storage.id"
          :resource-type="ResourceConstant.Type.STORAGE.value"
        />
      </template>
      <template v-else>
        <ResourceStorageObjectList :storage="state.storage" />
      </template>
    </template>
    <template v-else-if="state.storageError">
      <ResourceErrorCard
        :label="$t('__fieldStorage')"
        :status-code="state.storageError.data.status"
      />
    </template>
  </template>
</template>

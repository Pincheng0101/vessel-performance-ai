<script setup>
import { IconConstant, ListConstant, StateConstant } from '~/constants';

definePageMeta({
  middleware: [
    'workflow-template-access',
  ],
});

/**
 * @import { WorkflowDefinitionImportResponse } from '~/models/server/workflowTemplate'
 */

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const server = useServer();
const authStore = useAuthStore();
const { page, query, nextTokenMap, encodePageTokens, initUrlParams } = usePagination();
const { deleteTemplate, importWorkflowDefinition } = useWorkflowTemplate();
const { createSignal: createTemplateListSignal } = useAbortController();
const { createSignal: createTemplateSignal } = useAbortController();

const state = reactive({
  tags: [],
  selectedTags: ['all'],
  templates: [],
  isFetchTemplatesLoading: false,
  isFetchTemplateLoadingMap: {},
  perPage: ListConstant.ItemsPerPageOption.GRID[0],
  /**
   * @type {WorkflowDefinition}
   */
  workflowDefinition: null,
  /**
   * @type {WorkflowDefinitionImportResponse}
   */
  importWorkflowDefinitionResult: null,
});

const fetchTemplates = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createTemplateListSignal();

  state.isFetchTemplatesLoading = true;
  state.templates = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.workflowTemplate.list({
    nextToken,
    limit: state.perPage,
    query: query.value,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.isFetchTemplatesLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;
  state.templates = data.value.data;
  page.value = pageValue;
  state.isFetchTemplatesLoading = false;
};

initUrlParams();
fetchTemplates(page.value);

const fetchTags = () => {
  // TODO: Fetch tags from API
  state.tags = [
    {
      id: 'all',
      name: 'All',
    },
    {
      id: 'codeExecution',
      name: 'Code Execution',
    },
    {
      id: 'humanInteraction',
      name: 'Human Interaction',
    },
    {
      id: 'lambda',
      name: 'Lambda',
    },
    {
      id: 'llm',
      name: 'LLM',
    },
    {
      id: 'pass',
      name: 'Pass',
    },
    {
      id: 'readUrl',
      name: 'Read URL',
    },
    {
      id: 'retrieval',
      name: 'Retrieval',
    },
    {
      id: 'searchEngine',
      name: 'Search Engine',
    },
    {
      id: 'structuredLlm',
      name: 'Structured LLM',
    },
    {
      id: 'text',
      name: 'Text',
    },
    {
      id: 'transformation',
      name: 'Transformation',
    },
    {
      id: 'retriever',
      name: 'Retriever',
    },
    {
      id: 'ranker',
      name: 'Ranker',
    },
  ];
};

fetchTags();

const fetchTemplate = async (id) => {
  const signal = createTemplateSignal();

  state.isFetchTemplateLoadingMap = {
    ...state.isFetchTemplateLoadingMap,
    [id]: true,
  };
  state.workflowDefinition = null;
  const { data, error } = await server.workflowTemplate.get({
    workflowTemplateId: id,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.isFetchTemplateLoadingMap[id] = false;
    return;
  }
  state.workflowDefinition = data.value.workflowDefinition;
  state.isFetchTemplateLoadingMap[id] = false;
};

const handleFilter = () => {
  // TODO
};

const handleQueryChange = useDebounceFn(() => {
  router.replace({
    query: {
      ...route.query,
      q: query.value,
      page: undefined,
      pageToken: undefined,
    },
  });
  page.value = ListConstant.DefaultParams.PAGE;
  fetchTemplates(page.value);
}, 500);

const handleNextPage = () => {
  page.value += 1;
};

const handlePreviousPage = () => {
  page.value -= 1;
};

const handlePageChange = () => {
  const pageToken = encodePageTokens(nextTokenMap.value, page.value);
  router.replace({
    query: {
      ...route.query,
      page: page.value,
      pageToken,
    },
  });
  fetchTemplates(page.value);
};

const handlePerPageChange = (value) => {
  state.perPage = value;
  fetchTemplates();
};

const handleTemplateDelete = async ({ workflowTemplateId }) => {
  const { error } = await deleteTemplate({ workflowTemplateId });
  if (error) {
    return;
  }
  fetchTemplates(page.value);
};
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex align-center">
      <v-icon
        :icon="IconConstant.Base.WORKFLOW_TEMPLATE"
        class="mr-2"
        color="primary"
        size="small"
      />
      <span class="text-h6">
        {{ $t('__titleWorkflowTemplate', 2) }}
      </span>
    </div>
    <div class="d-flex align-center ga-2">
      <AppTextField
        v-model="query"
        :label="$t('__actionSearch')"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        class="flex-grow-1"
        @click:clear="() => { query = '' }"
        @update:model-value="handleQueryChange"
      />
      <WorkflowTemplateHeaderMenu v-if="authStore.parsedToken.isAdmin" />
    </div>
    <v-chip-group
      v-model="state.selectedTags"
      multiple
      column
      selected-class="text-primary font-weight-bold"
      @update:model-value="(v) => handleFilter(v)"
    >
      <AppChip
        v-for="tag in state.tags"
        :key="tag.id"
        class="mr-2 mb-2"
        :text="tag.name"
      />
    </v-chip-group>
    <v-row class="align-content-start">
      <template v-if="state.isFetchTemplatesLoading">
        <v-col
          v-for="i in 12"
          :key="i"
          :cols="12"
          :sm="6"
          :md="4"
        >
          <v-card
            :min-height="180"
            height="100%"
          >
            <AppSkeletonLoader type="card, paragraph" />
          </v-card>
        </v-col>
      </template>
      <template v-else-if="state.templates.length > 0">
        <v-col
          v-for="template in state.templates"
          :key="template.id"
          :cols="12"
          :sm="6"
          :md="4"
        >
          <v-hover v-slot="{ isHovering, props: p }">
            <v-card
              v-bind="p"
              :min-height="180"
              height="100%"
              class="position-relative"
              @click="() => navigateTo(`/workflow-templates/${template.id}`)"
            >
              <v-card-item>
                <template #prepend>
                  <v-icon
                    :icon="IconConstant.Base.WORKFLOW_TEMPLATE"
                    color="primary"
                  />
                </template>
                <div class="font-weight-medium text-truncate-2 pr-8">
                  {{ template.name }}
                </div>
                <div class="menu-button">
                  <WorkflowTemplateCardMenu
                    :item="template"
                    :persistent="isHovering"
                    :item-label="$t('__fieldTemplate')"
                    :delete-action-label="$t('__actionDelete')"
                    :on-delete="handleTemplateDelete"
                  />
                </div>
              </v-card-item>
              <v-card-text class="pb-0 px-4">
                <div class="mb-1">
                  <AppChip
                    v-for="(tag, i) in template.tags"
                    :key="i"
                    class="mr-2 mb-2"
                    :text="tag"
                    color="text"
                    @click="() => handleFilter([tag])"
                  />
                </div>
                <p class="text-truncate-3 mb-2">
                  {{ markdownUtils.toPlainText(template.description) }}
                </p>
                <div>
                  <div
                    v-for="action in template.actions"
                    :key="action"
                    class="ml-2 pa-1 bg-action d-inline-flex align-center justify-center rounded"
                  >
                    <v-icon
                      :icon="findField(StateConstant.ActionType, action, 'icon')"
                      color="white"
                      size="small"
                    />
                  </div>
                </div>
              </v-card-text>
              <v-card-actions class="justify-end pa-4">
                <AppDialog :on-submit="(formData) => importWorkflowDefinition(formData)">
                  <template #activator="{ onOpen }">
                    <AppButton
                      :text="$t('__actionUse')"
                      width="80"
                      :loading="!!state.isFetchTemplateLoadingMap[template.id]"
                      class="position-absolute bottom-0 right-0 mr-4 mb-4 primary-gradient"
                      @click.stop="async () => {
                        await fetchTemplate(template.id);
                        onOpen();
                      }"
                    />
                  </template>
                  <template #body="{ onSubmit, onCancel }">
                    <WorkflowCreateFromTemplateForm
                      :workflow-definition="state.workflowDefinition"
                      :on-submit="onSubmit"
                      :on-cancel="onCancel"
                    />
                  </template>
                </AppDialog>
              </v-card-actions>
            </v-card>
          </v-hover>
        </v-col>
      </template>
      <template v-else>
        <v-col :cols="12">
          <AppInfoCard
            :instruction="t('__instructionNoResultsFound')"
            min-height="400"
          />
        </v-col>
      </template>
    </v-row>
    <div class="w-100 d-flex justify-end align-center">
      <AppIconButton
        :disabled="page <= 1 || state.isFetchTemplatesLoading"
        icon="mdi-chevron-left"
        variant="text"
        size="small"
        @click="() => {
          handlePreviousPage();
          handlePageChange();
        }"
      />
      <span class="text-body-1 mx-4">
        {{ page }}
      </span>
      <AppIconButton
        :disabled="!nextTokenMap[page] || state.isFetchTemplatesLoading"
        icon="mdi-chevron-right"
        variant="text"
        size="small"
        @click="() => {
          handleNextPage();
          handlePageChange();
        }"
      />
      <div class="d-flex align-center ml-4">
        <span>{{ $t('__titleRowsPerPage') }}</span>
        <AppSelect
          v-model="state.perPage"
          :items="ListConstant.ItemsPerPageOption.GRID"
          :max-width="108"
          hide-details
          class="d-flex justify-center align-center ml-2"
          @update:model-value="handlePerPageChange"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.v-card-title) {
  background: transparent !important;
}
.menu-button {
  position: absolute;
  top: 16px;
  right: 16px;
}
</style>

<script setup>
import { ActionExecutionConstant, StatusConstant } from '~/constants';
import { LlmActionExecutionPayloadFactory } from '~/models/server/llm';

/**
 * @import { DatasetGenerationConfig } from '~/models/server/dataset'
 */

const props = defineProps({
  dataset: {
    type: Object,
    default: null,
  },
  onAddDatasetItem: {
    type: Function,
    default: null,
  },
  onReplaceFromStorage: {
    type: Function,
    default: null,
  },
  onDatasetItemsGenerate: {
    type: Function,
    default: null,
  },
  onGenerationConfigSave: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const route = useRoute();
const server = useServer();
const snackbarStore = useSnackbarStore();
const { createSignal } = useAbortController();
const { enableConfirmation, disableConfirmation } = useLeaveConfirmation();

const dialogReplaceFromStorageRef = ref(null);
const dialogCreateDatasetItemRef = ref(null);
const dialogReplaceFromStorageConfirmCardRef = ref(null);
const dialogActionResultFromStorageConfirmCardRef = ref(null);
const dialogGenerateDatasetItemsRef = ref(null);
const dialogSelectDatasetItemsRef = ref(null);

const state = reactive({
  progressMap: {},
  isLoading: false,
  replaceFromStorageForm: null,
  deleteColumnForm: null,
  actionResult: null,
  actionResultLabel: '',
  stopPolling: false,
  execution: null,
  generatedDatasetItems: [],
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const combinedFieldNames = computed(() => {
  const inputFieldNames = (props.dataset?.inputFields || []).map(field => field?.name).filter(Boolean);
  const outputFieldNames = (props.dataset?.outputFields || []).map(field => field?.name).filter(Boolean);
  return arrUtils.deduplicate([...inputFieldNames, ...outputFieldNames]);
});

const items = computed(() => [
  {
    title: t('__titleModifyItem', { action: t('__actionAdd'), item: t('__fieldDatasetItem') }),
    value: 'create',
    icon: 'mdi-plus',
    enabled: !!props.onAddDatasetItem,
    disabled: combinedFieldNames.value.length === 0,
    disabledTooltip: t('__tooltipDatasetItemAddNoFields'),
    callback: createDatasetItem,
  },
  {
    title: t('__actionReplaceDatasetItemsFromStorage'),
    value: 'createDatasetItemFromStorage',
    icon: 'mdi-file-cabinet',
    enabled: !!props.onReplaceFromStorage,
    callback: createDatasetItemFromStorage,
  },
  {
    title: t('__actionGenerateDatasetItems'),
    value: 'generateDatasetItems',
    icon: 'mdi-auto-fix',
    enabled: !!props.onDatasetItemsGenerate,
    disabled: !props.dataset.inputFields || props.dataset.inputFields?.length === 0,
    disabledTooltip: t('__tooltipDatasetItemsGenerateNoInputFields'),
    callback: generateDatasetItems,
  },
]);

const closeMenu = () => {
  model.value = false;
};

const createDatasetItem = () => {
  dialogCreateDatasetItemRef.value.open();
};

const createDatasetItemFromStorage = () => {
  dialogReplaceFromStorageRef.value.open();
};

const openActionResultDialog = (result, actionLabel) => {
  state.actionResult = result;
  state.actionResultLabel = actionLabel;
  dialogActionResultFromStorageConfirmCardRef.value.open();
};

const generateDatasetItems = () => {
  dialogGenerateDatasetItemsRef.value.open();
};

/**
 * @param {Object<string, any>} v
 */
const handleDatasetItemCreate = async (v) => {
  const { data, error } = await server.datasetItem.create({
    datasetId: route.params.id,
    datasetItemsData: v,
  });
  if (error.value) {
    console.error(error);
    snackbarStore.setActionFailure('__actionAdd');
    return;
  }
  props.onAddDatasetItem(v);
  if (data.value.failures.length > 0) {
    openActionResultDialog(data.value, '__actionCreate');
    closeMenu();
    return;
  }
  snackbarStore.setActionSuccess('__actionAdd');
  closeMenu();
};

const handleStorageReplaceConfirmDialogOpen = async (v) => {
  state.replaceFromStorageForm = v;
  await dialogReplaceFromStorageConfirmCardRef.value.confirm();
};

const getSyncDatasetItemExecution = async (executionArn) => {
  if (!executionArn || state.stopPolling) return null;
  state.isLoading = true;
  const { data, error } = await server.datasetItem.getSync({ executionArn });
  if (error.value) {
    state.error = error.value.data;
    state.isLoading = false;
    return null;
  }
  state.execution = data.value;
  if (state.execution.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return await getSyncDatasetItemExecution(executionArn);
  }
  state.isLoading = false;
  return data.value;
};

const handleDatasetItemFromStorageReplace = async (v) => {
  state.isLoading = true;
  enableConfirmation();
  const { error: updateError } = await server.dataset.update({
    datasetId: route.params.id,
    description: props.dataset.description,
    datasetName: props.dataset.name,
    inputFields: arrUtils.cast(v.inputFields),
    outputFields: arrUtils.cast(v.outputFields),
  });
  if (updateError.value) {
    console.error(updateError.value);
    snackbarStore.setActionFailure('__actionUpdate');
    disableConfirmation();
    state.isLoading = false;
    return;
  }

  const { data, error } = await server.datasetItem.startSync({
    datasetId: route.params.id,
    storageId: v.storageId,
    objectPath: v.objectPath,
    inputFields: v.inputFields,
    outputFields: v.outputFields,
    filterUndefinedFields: v.filterUndefinedFields,
  });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionReplace');
    return;
  }
  state.stopPolling = false;
  const result = await getSyncDatasetItemExecution(data.value.executionArn);
  disableConfirmation();
  state.isLoading = false;
  if (result?.error || result.output?.errorMessage) {
    snackbarStore.setFailure(result.error || result.output?.errorMessage);
    closeMenu();
    return;
  }
  props.onReplaceFromStorage(v);
  if (result.failures?.length > 0) {
    openActionResultDialog(result.output, '__actionReplace');
    closeMenu();
    return;
  }
  snackbarStore.setActionSuccess('__actionReplace');
  closeMenu();
};

/**
 * @param {DatasetGenerationConfig} v
 */
const handleGenerationConfigSave = async (v) => {
  const { error } = await server.dataset.update({
    ...props.dataset,
    generationConfig: v,
  });
  if (error.value) {
    console.error(error.value);
    return;
  }
};

const pollDatasetItemsGenerate = async (executionArn) => {
  if (!executionArn) return null;
  const signal = createSignal();

  const { data, error } = await server.dataForge.getItemsGeneration({ executionArn }, { signal });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionGenerate');
    return;
  }
  const result = data.value;
  if (result.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return await pollDatasetItemsGenerate(executionArn);
  }
  return result;
};

const handleDatasetItemsGenerate = async (v) => {
  state.isLoading = true;
  const { data, error } = await server.dataForge.startItemsGeneration({
    ...v,
    datasetId: route.params.id,
    inputFields: props.dataset?.inputFields,
    outputFields: props.dataset?.outputFields,
    executionLlm: LlmActionExecutionPayloadFactory.toRequestPayload({
      ...v.executionLlm,
      messages: [],
    }),
  });
  if (error.value) {
    console.error(error.value);
    snackbarStore.setActionFailure('__actionGenerate');
    return;
  }
  const result = await pollDatasetItemsGenerate(data.value.executionArn);
  state.generatedDatasetItems = result?.output?.generatedItems || [];
  state.isLoading = false;
  if (v.saveGenerationConfig) {
    await handleGenerationConfigSave(result?.generationConfig);
    props.onGenerationConfigSave();
  }
  dialogSelectDatasetItemsRef.value.open();
};
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        icon="mdi-plus"
        class="primary-gradient"
      />
    </template>
    <v-card
      :elevation="1"
      :width="300"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="item in items"
          :key="item.title"
        >
          <v-hover v-slot="{ isHovering, props: hoverProps }">
            <div v-bind="hoverProps">
              <v-list-item
                class="text-body-2"
                :class="{ 'd-none': !item.enabled }"
                :disabled="item.disabled"
                @click="item.callback"
              >
                <template #prepend>
                  <v-icon
                    :icon="item.icon"
                    size="small"
                    color="primary"
                  />
                </template>
                {{ item.title }}
                <template v-if="item.disabled && item.disabledTooltip">
                  <AppTooltip
                    :text="item.disabledTooltip"
                    location="bottom"
                    activator="parent"
                    :model-value="isHovering"
                  />
                </template>
              </v-list-item>
            </div>
          </v-hover>
        </template>
      </v-list>
    </v-card>
  </v-menu>
  <AppDialog
    ref="dialogCreateDatasetItemRef"
    :on-submit="handleDatasetItemCreate"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemsForm
        :field-names="combinedFieldNames"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogReplaceFromStorageRef"
    :width="1000"
  >
    <template #body="{ onCancel }">
      <ResourceDatasetItemFromStorageReplaceForm
        :on-submit="handleStorageReplaceConfirmDialogOpen"
        :on-discard="onCancel"
        :show-submit-loading="false"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogReplaceFromStorageConfirmCardRef"
    :on-submit="async () => {
      await handleDatasetItemFromStorageReplace(state.replaceFromStorageForm)
      dialogReplaceFromStorageRef.close();
    }"
    :on-cancel="() => {
      state.replaceFromStorageForm = null;
      state.isLoading = false;
    }"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemReplaceConfirmationCard
        :loading="state.isLoading"
        :on-cancel="onCancel"
        :on-submit="onSubmit"
      />
    </template>
  </AppDialog>
  <AppDialog ref="dialogActionResultFromStorageConfirmCardRef">
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemActionResultConfirmationCard
        :success-count="state.actionResult?.successCount"
        :failures="state.actionResult?.failures"
        :action-label="$t(state.actionResultLabel)"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog ref="dialogGenerateDatasetItemsRef">
    <template #body="{ onCancel }">
      <ResourceDatasetItemGenerateForm
        :dataset="props.dataset"
        :field-names="combinedFieldNames"
        :generation-config="props.dataset?.generationConfig"
        :on-submit="handleDatasetItemsGenerate"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogSelectDatasetItemsRef"
    :width="1000"
  >
    <template #body="{ onCancel }">
      <ResourceDatasetItemsSelectionForm
        :items="state.generatedDatasetItems"
        :field-names="combinedFieldNames"
        :on-submit="async (v) => {
          await handleDatasetItemCreate(v);
          state.generatedDatasetItems = [];
          dialogSelectDatasetItemsRef.close();
          dialogGenerateDatasetItemsRef.close();
        }"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

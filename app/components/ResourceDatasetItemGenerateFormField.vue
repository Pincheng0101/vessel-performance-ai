<script setup>
import { DataForgeConstant, ResourceConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';

/**
 * @import { Llm } from '~/models/server/llm';
 */

/**
 * @typedef {Object<string, string>} DatasetItemData
 */
/**
 * @type {{ item: DatasetItemData | null }}
 */
const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  dataset: {
    type: Object,
    default: null,
  },
  fieldNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const route = useRoute();
const server = useServer();
const { page, perPage, nextTokenMap } = usePagination({
  type: ResourceConstant.Type.DATASET.value,
});
nextTokenMap.value = {};

const dialogExistingDatasetItemsRef = ref(null);

const state = reactive({
  restoredExecutionLlm: null,
  draftExecutionLlmFormData: null,
  isExampleMenuOpen: false,
  isExistingDatasetItemsLoading: false,
  hasLoadedExistingDatasetItems: false,
  existingDatasetItems: [],
  refreshForm: 0,
});

{
  if (props.fieldNames.length > 0 && props.item) {
    props.fieldNames.forEach(fieldName => formData.value[fieldName] = props.item?.[fieldName]);
  }
  if (!formData.value?.executionLlm) {
    formData.value.executionLlm = LlmFactory.create(DataForgeConstant.DefaultParams.EXECUTION_LLM);
    state.restoredExecutionLlm = formData.value.executionLlm;
  }
  if (!Array.isArray(formData.value?.generationAttachments)) {
    formData.value.generationAttachments = [];
  }
  if (!formData.value.generationSize) {
    formData.value.generationSize = DataForgeConstant.DefaultParams.GENERATION_SIZE.default;
  }
}

const updateExecutionLlm = () => Object.assign(formData.value.executionLlm, state.draftExecutionLlmFormData);

const existingExampleItems = computed(() => {
  return (state.existingDatasetItems || []).map((item) => {
    const data = item.datasetItemData || {};
    return {
      id: item.id,
      ...Object.fromEntries((props.fieldNames || []).map(fieldName => [
        fieldName,
        data.inputFields?.[fieldName] ?? data.outputFields?.[fieldName] ?? data[fieldName],
      ])),
    };
  });
});

const hasExistingDatasetItems = computed(() => existingExampleItems.value.length > 0);
const importedExampleKeySet = computed(() => new Set((formData.value.generationExamples || []).map(createExampleKey)));

const disabledExistingDatasetItemIdMap = computed(() => {
  return Object.fromEntries(
    existingExampleItems.value
      .filter(item => importedExampleKeySet.value.has(createExampleKey(item)))
      .map(item => [item.id, true]),
  );
});

const sortObjectKeysDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  if (objUtils.isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObjectKeysDeep(value[key])]));
  }
  return value;
};

const toGenerationExampleData = (item = {}) => {
  return Object.fromEntries((props.fieldNames || []).map(fieldName => [
    fieldName,
    item?.[fieldName],
  ]));
};

const createExampleKey = (item = {}) => JSON.stringify(sortObjectKeysDeep(toGenerationExampleData(item)));

const fetchExistingDatasetItems = async (pageValue = 1, pageToken = null) => {
  state.isExistingDatasetItemsLoading = true;
  state.existingDatasetItems = [];
  const nextToken = pageValue === 1 ? null : (pageToken || nextTokenMap.value[pageValue - 1]);
  const { data, error } = await server.datasetItem.list({
    datasetId: route.params.id,
    limit: perPage.value,
    nextToken,
  }, {
    lazy: false,
  });
  if (error.value) {
    state.hasLoadedExistingDatasetItems = true;
    state.isExistingDatasetItemsLoading = false;
    return;
  }
  state.existingDatasetItems = data.value.data || [];
  nextTokenMap.value[pageValue] = data.value.nextToken;
  page.value = pageValue;
  state.hasLoadedExistingDatasetItems = true;
  state.isExistingDatasetItemsLoading = false;
};

const handleExistingDatasetItemsPerPageChange = (value) => {
  perPage.value = value;
  nextTokenMap.value = {};
  fetchExistingDatasetItems();
};

const handleExistingDatasetItemsImport = (items = []) => {
  formData.value.generationExamples = [
    ...(formData.value.generationExamples || []),
    ...items.map(toGenerationExampleData),
  ];
  state.refreshForm += 1;
};

const openExistingDatasetItemsDialog = async () => {
  dialogExistingDatasetItemsRef.value.open();
  if (!state.hasLoadedExistingDatasetItems) {
    await fetchExistingDatasetItems();
  }
};

/**
 * @param {Llm} v
 */
const handleExecutionLlmChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncExecutionLlm(v);
};

/**
 * @param {Llm} v
 */
const syncExecutionLlm = (v) => {
  if (!v) return;
  const llm = LlmFactory.create({
    ...v,
  });
  formData.value.executionLlm = llm;
};

await fetchExistingDatasetItems();
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldDatasetItemGenerationInstruction')"
    :tooltip="$t('__tooltipDatasetItemGenerationInstruction')"
    required
  >
    <AppTextarea
      :id="id"
      v-model="formData.generationInstruction"
      :disabled="props.loading"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthBetween(
            DataForgeConstant.DefaultParams.GENERATION_INSTRUCTION.min,
            DataForgeConstant.DefaultParams.GENERATION_INSTRUCTION.max,
          )
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    :label="$t('__fieldAttachment', 2)"
    :tooltip="$t('__tooltipDatasetItemGenerationAttachments')"
  >
    <PromptRewriteAttachmentTable
      v-model="formData.generationAttachments"
      :llm-type="formData.executionLlm?.llmType"
      :loading="props.loading"
    />
  </AppInputGroup>
  <AppInputGroup
    :label="$t('__fieldExample', 2)"
    :tooltip="$t('__tooltipDatasetItemGenerationExamples')"
  >
    <ResourceDatasetItemCreateTable
      v-model="formData.generationExamples"
      :field-names="props.fieldNames"
      :loading="props.loading"
    >
      <template #bottom-action="{ onOpen }">
        <ResourceDatasetItemGenerateExampleMenu
          v-model="state.isExampleMenuOpen"
          :loading="props.loading"
          :import-disabled="state.isExistingDatasetItemsLoading || (state.hasLoadedExistingDatasetItems && !hasExistingDatasetItems)"
          :on-add="onOpen"
          :on-import-existing="openExistingDatasetItemsDialog"
        />
        <AppDialog
          ref="dialogExistingDatasetItemsRef"
          :width="1000"
          :on-submit="handleExistingDatasetItemsImport"
        >
          <template #body="{ onSubmit, onCancel }">
            <ResourceDatasetItemsSelectionForm
              :key="state.refreshForm"
              server-side
              :items="existingExampleItems"
              :loading="state.isExistingDatasetItemsLoading"
              :has-next-page="!!nextTokenMap[page]"
              :page="page"
              :per-page="perPage"
              :next-token-map="nextTokenMap"
              :disabled-id-map="disabledExistingDatasetItemIdMap"
              :disabled-tooltip="$t('__tooltipDatasetItemAlreadyImportedAsExample')"
              :field-names="props.fieldNames"
              :action-label="$t('__actionImport')"
              :item-label="$t('__fieldExample', 2)"
              :instruction="$t('__instructionImportDatasetItemsAsExamples')"
              :on-page-change="fetchExistingDatasetItems"
              :on-per-page-change="handleExistingDatasetItemsPerPageChange"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </template>
    </ResourceDatasetItemCreateTable>
  </AppInputGroup>
  <ResourceLlmPaginatedSelect
    v-model="formData.executionLlm"
    v-model:restored-objects="state.restoredExecutionLlm"
    :field-name="$t('__fieldExecutionLlm')"
    :disabled="props.loading"
    :tooltip="$t('__tooltipDatasetItemExecutionLlm')"
    required
    @update:model-value="handleExecutionLlmChange"
    @update:restored-objects="(v) => {
      if (!v) return;
      syncExecutionLlm(v);
    }"
  >
    <template #append>
      <AppDialog
        ref="executionLlmSettingsDialogRef"
        :on-submit="updateExecutionLlm"
      >
        <template #activator="{ onOpen }">
          <template v-if="formData.executionLlm">
            <AppIconButton
              icon="mdi-tune"
              variant="text"
              aria-label="Tune Execution LLM Settings"
              @click="() => {
                state.draftExecutionLlmFormData = formData.executionLlm;
                onOpen();
              }"
            />
          </template>
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AppForm
            :form-title="$t('__titleModifyItem', { action: $t('__actionConfigure'), item: formData.executionLlm ? formData.executionLlm.llmName : '' })"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          >
            <template #body>
              <ResourceLlmFormFields
                :key="formData.executionLlm.id"
                v-model:form-data="state.draftExecutionLlmFormData"
                :resource="formData.executionLlm"
                :hidden-fields="['llmName', 'llmType', 'apiKey', 'endpointUrl', 'region', 'crossRegionInference', 'model', 'credentialType']"
                input-layout="narrow"
              />
            </template>
          </AppForm>
        </template>
      </AppDialog>
    </template>
  </ResourceLlmPaginatedSelect>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldDatasetItemGenerationSize')"
    :tooltip="$t('__tooltipDatasetItemGenerationSize')"
  >
    <AppSlider
      :id="id"
      v-model="formData.generationSize"
      :min="DataForgeConstant.DefaultParams.GENERATION_SIZE.min"
      :max="DataForgeConstant.DefaultParams.GENERATION_SIZE.max"
      :step="DataForgeConstant.DefaultParams.GENERATION_SIZE.step"
      :disabled="props.loading"
      :rules="(
        $validator
          .defineField(label)
          .gte(DataForgeConstant.DefaultParams.GENERATION_SIZE.min)
          .lte(DataForgeConstant.DefaultParams.GENERATION_SIZE.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldDatasetSaveGenerateConfig')"
    :tooltip="$t('__tooltipDatasetSaveGenerationConfig')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.saveGenerationConfig"
      :disabled="props.loading"
      default-value
    />
  </AppInputGroup>
</template>

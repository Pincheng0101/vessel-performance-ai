<script setup>
import { DatasetConstant, FileExtensionConstant, ListConstant } from '~/constants';

const props = defineProps({
  formData: {
    type: Object,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
  showSubmitLoading: {
    type: Boolean,
    default: true,
  },
});

const server = useServer();
const snackbarStore = useSnackbarStore();
const { t } = useI18n();
const { mdAndUp } = useDisplay();

const state = reactive({
  formData: {
    storageId: '',
    objectPath: '',
    inputFields: [],
    outputFields: [],
    filterUndefinedFields: DatasetConstant.DefaultParams.FILTER_UNDEFINED_FIELDS,
  },
  isLoading: false,
  isObjectPreviewLoading: false,
  storageResource: null,
  previewObject: null,
  previewError: null,
});

const availableFieldNames = computed(() => state.previewObject?.fieldNames || []);
const inputFieldNames = computed(() => state.formData.inputFields.map(field => field?.name).filter(Boolean));
const outputFieldNames = computed(() => state.formData.outputFields.map(field => field?.name).filter(Boolean));
const usedFieldNames = computed(() => arrUtils.deduplicate([...inputFieldNames.value, ...outputFieldNames.value]));
const shouldExpandPreviewPlaceholder = computed(() => mdAndUp.value && !state.formData.storageId);

const handleStorageResourceChange = (storageResource) => {
  state.storageResource = storageResource;
  state.formData.storageId = storageResource?.id || '';
  state.formData.inputFields = [];
  state.formData.outputFields = [];
  state.formData.objectPath = '';
  state.previewObject = null;
  state.previewError = null;
};

const handleObjectPreview = async () => {
  state.previewObject = null;
  state.previewError = null;
  if (!state.formData.storageId || !state.formData.objectPath) {
    return;
  }
  state.isObjectPreviewLoading = true;
  const { data, error } = await server.storageObject.preview({
    storageId: state.formData.storageId,
    objectPath: state.formData.objectPath,
  });
  if (error.value) {
    console.error(error.value);
    state.previewError = error.value.data || error.value;
    state.isObjectPreviewLoading = false;
    snackbarStore.setFailure(t('__messageFailedToLoadFileFields'));
    return;
  }
  state.previewObject = data.value;
  state.isObjectPreviewLoading = false;
};

const submit = async () => {
  await props.onSubmit(state.formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__actionReplaceDatasetItemsFromStorage')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
    :show-submit-loading="props.showSubmitLoading"
  >
    <template #body>
      <v-row :class="{ 'replace-form-preview-placeholder': shouldExpandPreviewPlaceholder }">
        <v-col
          cols="12"
          md="5"
        >
          <ResourceStoragePaginatedSelect
            v-model="state.storageResource"
            v-model:restored-objects="state.storageResource"
            :enable-state-input-switch="false"
            required
            @update:model-value="handleStorageResourceChange"
          />
          <ResourceStorageObjectSelect
            v-if="state.formData.storageId"
            v-model="state.formData.objectPath"
            :enable-state-input-switch="false"
            :disabled="!state.storageResource"
            :storage="state.storageResource"
            :return-object="false"
            :disable-condition="{
              logic: ListConstant.FilterLogic.AND,
              conditions: [
                { field: 'contentType', operator: '!=', value: FileExtensionConstant.Base.JSONL.mediaType },
                { field: 'contentType', operator: '!=', value: FileExtensionConstant.Base.CSV.mediaType },
              ],
            }"
            :disabled-tooltip="$t('__tooltipOnlySupportedFileTypes', { fileTypes: [FileExtensionConstant.Base.CSV.title, FileExtensionConstant.Base.JSONL.title].join(', ') })"
            @update:model-value="async (objectPath) => {
              state.isLoading = true;
              state.formData.objectPath = objectPath;
              await handleObjectPreview();
              state.isLoading = false;
            }"
          />
          <AppInputGroup
            v-if="state.formData.storageId"
            v-slot="{ label }"
            :label="$t('__fieldInputField', 2)"
            required
          >
            <ResourceDatasetFieldTable
              v-model="state.formData.inputFields"
              :available-names="availableFieldNames"
              :used-names="usedFieldNames"
              :disabled="!state.formData.objectPath"
              :loading="state.isLoading || state.isObjectPreviewLoading"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="state.formData.storageId"
            :label="$t('__fieldOutputField', 2)"
          >
            <ResourceDatasetFieldTable
              v-model="state.formData.outputFields"
              :available-names="availableFieldNames"
              :used-names="usedFieldNames"
              :disabled="!state.formData.objectPath"
              :loading="state.isLoading || state.isObjectPreviewLoading"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="state.formData.storageId"
            v-slot="{ id }"
            :label="$t('__fieldStoreSelectedFieldsOnly')"
            :tooltip="$t('__tooltipResourceDatasetStoreSelectedFieldsOnly')"
          >
            <AppSwitch
              :id="id"
              v-model="state.formData.filterUndefinedFields"
              hide-details
            />
          </AppInputGroup>
        </v-col>
        <v-col
          cols="12"
          md="7"
        >
          <div
            class="d-flex align-center justify-center"
            :class="{ 'h-100': !state.formData.objectPath }"
          >
            <template v-if="state.formData.objectPath">
              <AppInputGroup
                class="w-100"
                :label="$t('__titleFilePreview')"
              >
                <ResourceStorageObjectPreviewCard
                  :preview="state.previewObject"
                  :loading="state.isObjectPreviewLoading"
                  :error="state.previewError"
                />
              </AppInputGroup>
            </template>
            <template v-else>
              <v-sheet class="placeholder-card h-100 w-100 d-flex align-center justify-center rounded-lg bg-transparent">
                <ResourceInitCard
                  icon="mdi-table-eye"
                  :title="$t('__titleFilePreview')"
                  :instruction="$t('__instructionPreviewAvailableAfterFileSelected')"
                  :show-actions="false"
                />
              </v-sheet>
            </template>
          </div>
        </v-col>
      </v-row>
    </template>
  </AppForm>
</template>

<style lang="scss" scoped>
.placeholder-card {
  border: 1px solid rgba(var(--v-theme-backgroundScale3));
}

.replace-form-preview-placeholder {
  // 100dvh - dialog margin - form title - divider - card text vertical padding
  min-height: calc(100dvh - 48px - 72px - 1px - 32px);
}
</style>

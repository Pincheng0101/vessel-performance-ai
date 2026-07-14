<script setup>
import { ListConstant } from '~/constants';

/**
 * @import { StorageObjectPreviewResponse } from '~/models/server/storageObject'
 */

/**
 * @type {{ preview: StorageObjectPreviewResponse }}
 */
const props = defineProps({
  preview: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Object,
    default: null,
  },
});

const { t } = useI18n();

const previewRows = computed(() => {
  return Array.isArray(props.preview?.previewRows) ? props.preview.previewRows : [];
});

const fieldNames = computed(() => {
  if (Array.isArray(props.preview?.fieldNames) && props.preview.fieldNames.length > 0) {
    return props.preview.fieldNames.map(String);
  }

  const objectFieldNameSet = previewRows.value.reduce((acc, row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      Object.keys(row).forEach(key => acc.add(key));
    }
    return acc;
  }, new Set());
  if (objectFieldNameSet.size > 0) {
    return Array.from(objectFieldNameSet);
  }

  const maxColumnCount = previewRows.value.reduce((acc, row) => {
    return Array.isArray(row) ? Math.max(acc, row.length) : Math.max(acc, 1);
  }, 0);
  return Array.from({ length: maxColumnCount }, (_, index) => `${t('__fieldField')} ${index + 1}`);
});

const hasPreviewRows = computed(() => previewRows.value.length > 0);
const hasPreviewFields = computed(() => fieldNames.value.length > 0);

const formatCellValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getCellValue = (row, fieldName, index) => {
  if (Array.isArray(row)) return row[index];
  if (row && typeof row === 'object') return row[fieldName];
  return index === 0 ? row : undefined;
};

const previewHeaders = computed(() => fieldNames.value.map((fieldName, index) => ({
  title: fieldName,
  key: `field${index}`,
  minWidth: 220,
  value: item => item.values[index],
  maxChars: 120,
  isSingleLine: true,
})));

const previewItems = computed(() => previewRows.value.map((row, rowIndex) => ({
  id: rowIndex,
  values: fieldNames.value.map((fieldName, fieldIndex) => formatCellValue(getCellValue(row, fieldName, fieldIndex))),
})));
</script>

<template>
  <div class="storage-object-preview">
    <AppAlert
      v-if="props.error"
      :text="$t('__instructionFilePreviewFailed')"
      class="mx-4"
    />
    <div
      v-else-if="!props.loading && (!hasPreviewRows || !hasPreviewFields)"
      class="d-flex justify-center pa-4"
    >
      {{ $t('__instructionNoPreviewData') }}
    </div>
    <div v-else>
      <div class="d-flex ga-2 pb-3 justify-end">
        <AppChip
          density="compact"
          variant="tonal"
          prepend-icon="mdi-table-row"
          :text="`${$t('__messagePreviewFirstRows', { count: ListConstant.StorageObjectParams.PREVIEW_CONTENT_LIMIT })}`"
        />
        <AppChip
          density="compact"
          variant="tonal"
          prepend-icon="mdi-table-column"
          :text="`${fieldNames.length} ${$t('__fieldColumn', fieldNames.length)}`"
        />
      </div>
      <AppTable
        :headers="previewHeaders"
        :items="previewItems"
        :loading="props.loading"
        :server-side="false"
        :show-pagination="false"
        :enable-search="false"
        density="compact"
        enable-scroll-button
        hide-details
        bordered
        variant="flat"
      >
        <template #loading>
          <AppSkeletonLoader type="table" />
        </template>
      </AppTable>
    </div>
  </div>
</template>

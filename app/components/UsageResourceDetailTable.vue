<script setup>
/**
 * @import { UsageResourceDetailRow } from '~/models/ui/usage/UsageResource.d'
 */

/**
 * @type {{ i18nTitle: string, resourceType: string, rows: UsageResourceDetailRow[], totalCallCount: number }}
 */
const props = defineProps({
  resourceType: {
    type: String,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  i18nTitle: {
    type: String,
    required: true,
  },
  totalCallCount: {
    type: Number,
    required: true,
  },
});

const ColumnKey = Object.freeze({
  NAME: 'name',
  TYPE: 'type',
  CALL_COUNT: 'callCount',
  SHARE: 'share',
});
const { t } = useI18n();
const { formatResourceTotalCallCount } = useUsageFormatters();

const tableRows = computed(() => (Array.isArray(props.rows) ? props.rows : []));
const sectionTitle = computed(() => (
  `${t(props.i18nTitle)} · ${formatResourceTotalCallCount(props.resourceType, props.totalCallCount)}`
));
const shouldShowNameColumn = computed(() => (
  tableRows.value.some(row => row.name || row.link)
));
const headers = computed(() => {
  const nameHeaders = [];

  if (shouldShowNameColumn.value) {
    nameHeaders.push({
      key: ColumnKey.NAME,
      title: t('__fieldName'),
      minWidth: 240,
      link: item => item.link,
      isSingleLine: true,
    });
  }

  return [
    ...nameHeaders,
    {
      key: ColumnKey.TYPE,
      title: t('__fieldType'),
      iconPath: item => item.iconPath,
    },
    {
      key: ColumnKey.CALL_COUNT,
      title: t('__fieldUsageQueryCount'),
      isNumber: true,
    },
    {
      key: ColumnKey.SHARE,
      title: t('__fieldShare'),
      value: item => numUtils.formatPercentageLabel(item.share),
    },
  ];
});
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div class="d-flex align-center justify-space-between ga-3 px-1">
      <span class="text-subtitle-2 font-weight-bold">
        {{ sectionTitle }}
      </span>
    </div>
    <AppTable
      :headers="headers"
      :items="tableRows"
      item-value="id"
      :server-side="false"
      :show-pagination="false"
      :enable-search="false"
      variant="flat"
      hide-details
      hide-no-data
    />
  </div>
</template>

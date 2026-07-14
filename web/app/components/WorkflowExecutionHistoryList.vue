<script setup>
import { WorkflowExecutionConstant } from '~/constants';

const props = defineProps({
  executionArn: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();
const {
  fetchCompleteHistory,
  historyByEvent,
  historyByFinishedState,
  isLoading,
} = useWorkflowExecutionHistory();

const { Category } = WorkflowExecutionConstant;
const PER_PAGE = 100;

const state = reactive({
  category: Category.STATE.value,
});

if (props.executionArn) {
  fetchCompleteHistory({
    executionArn: props.executionArn,
  });
}

const tableHeaders = computed(() => {
  return state.category === Category.STATE.value
    ? [
        { title: t('__fieldName'), key: 'name' },
        { title: t('__fieldType'), key: 'type' },
        { title: t('__fieldStatus'), key: 'status', isStatus: true },
        { title: t('__fieldDuration'), key: 'duration', isTimeInterval: true, timeIntervalOptions: { format: 'HH:mm:ss.SSS' } },
        { title: t('__fieldStartedAfter'), key: 'startedAfter', isTimeInterval: true, timeIntervalOptions: { format: 'HH:mm:ss.SSS' } },
      ]
    : [
        { title: t('__fieldId'), key: 'id', sortable: true },
        { title: t('__fieldType'), key: 'type', icon: item => findField(WorkflowExecutionConstant.EventType, item.type, 'icon'), iconColor: item => findField(WorkflowExecutionConstant.EventType, item.type, 'iconColor') },
        { title: t('__fieldStep'), key: 'step' },
        { title: t('__fieldStartedAfter'), key: 'startedAfter', isTimeInterval: true, timeIntervalOptions: { format: 'HH:mm:ss.SSS' } },
        { title: t('__fieldTimestamp'), key: 'timestamp', isTimestamp: true, sortable: true, timestampOptions: { isRelative: false, format: 'YYYY-MM-DD HH:mm:ss.SSS' } },
      ];
});

const tableItems = computed(() => state.category === Category.STATE.value ? historyByFinishedState.value : historyByEvent.value);

const getExpandedRowItems = (item) => {
  const result = computed(() => {
    if (state.category === Category.STATE.value) {
      return [
        {
          title: t('__fieldInput'),
          value: item.input,
          isJsonCode: true,
        },
        {
          title: t('__fieldOutput'),
          value: item.output,
          isJsonCode: true,
          isHidden: !item.output,
        },
        {
          title: t('__fieldError'),
          value: item.error,
          isHidden: !item.error,
          isChip: true,
        },
        {
          title: t('__fieldCause'),
          value: item.cause,
          isJsonCode: true,
          isHidden: !item.cause,
          editorOptions: { enableLineWrapping: true },
        },
      ];
    }
    return [
      {
        value: item.details,
        isJsonCode: true,
      },
    ];
  });
  return result.value;
};
</script>

<template>
  <AppTable
    :server-side="false"
    :headers="tableHeaders"
    :items="tableItems"
    :per-page="PER_PAGE"
    :loading="tableItems.length === 0"
    :show-progress="isLoading"
    enable-expand
    icon="mdi-clipboard-text-clock"
  >
    <template #header-actions>
      <AppSelect
        v-model="state.category"
        :items="Object.values(WorkflowExecutionConstant.Category).map(item => ({ ...item, title: $t(item.i18nTitle) }))"
        hide-details
      />
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchCompleteHistory({ executionArn: props.executionArn })"
      />
    </template>
    <template #no-data>
      <p class="d-flex justify-center align-center">
        {{ $t('__instructionNoHistoryFound') }}
      </p>
    </template>
    <template #expanded-row="{ item }">
      <div class="py-3">
        <AppDisplayFieldGroup :items="getExpandedRowItems(item)" />
      </div>
    </template>
  </AppTable>
</template>

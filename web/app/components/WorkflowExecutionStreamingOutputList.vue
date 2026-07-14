<script setup>
import { StreamingConstant } from '~/constants';

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  showProgress: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();

const PER_PAGE = 100;

const tableHeaders = computed(() => {
  return [
    { title: t('__fieldName'), key: 'name' },
    { title: t('__fieldType'), value: item => findField(StreamingConstant.ResponseType, item.responseType, 'title'), icon: item => findField(StreamingConstant.ResponseType, item.responseType, 'icon'), iconColor: item => findField(StreamingConstant.ResponseType, item.responseType, 'iconColor') },
    { title: t('__fieldTimestamp'), key: 'timestamp', isTimestamp: true, sortable: true, timestampOptions: { isRelative: false, format: 'YYYY-MM-DD HH:mm:ss.SSS' } },
  ];
});

const tableItems = computed(() => [...props.messages].sort((a, b) => b.timestamp - a.timestamp));

const getExpandedRowItems = (item) => {
  const result = computed(() => {
    const commonItems = [];

    switch (item.responseType) {
      case StreamingConstant.ResponseType.START.value:
        commonItems.push({
          title: t('__fieldExecutionArn'),
          value: item.executionArn,
          isHidden: !item.executionArn,
        });
        break;

      case StreamingConstant.ResponseType.DATA.value:
        commonItems.push(
          {
            title: t('__fieldActionId'),
            value: item.actionId,
            isHidden: !item.actionId,
          },
          {
            title: t('__fieldActionType'),
            value: item.actionType,
            isHidden: !item.actionType,
          },
          {
            title: t('__fieldOutput'),
            value: item.output,
            isJsonCode: true,
            isHidden: !item.output,
          },
        );
        break;

      case StreamingConstant.ResponseType.END.value:
        commonItems.push({
          title: t('__fieldResponse'),
          value: item.response,
          isJsonCode: true,
          isHidden: !item.response,
        });
        break;

      case StreamingConstant.ResponseType.ERROR.value:
        commonItems.push(
          {
            title: t('__fieldStatusCode'),
            value: item.statusCode,
            isHidden: !item.statusCode,
          },
          {
            title: t('__fieldError'),
            value: item.error,
            isJsonCode: true,
            isHidden: !item.error,
          },
        );
        break;

      default:
        commonItems.push({
          title: t('__fieldRawData'),
          value: item,
          isJsonCode: true,
        });
        break;
    }

    return commonItems.filter(item => !item.isHidden);
  });
  return result.value;
};
</script>

<template>
  <AppTable
    :headers="tableHeaders"
    :items="tableItems"
    :per-page="PER_PAGE"
    :loading="props.isLoading || tableItems.length === 0"
    :show-progress="props.showProgress"
    enable-expand
    icon="mdi-broadcast"
  >
    <template #no-data>
      <p class="d-flex justify-center align-center">
        {{ $t('__instructionNoStreamingOutputFound') }}
      </p>
    </template>
    <template #expanded-row="{ item }">
      <div class="py-3">
        <AppDisplayFieldGroup :items="getExpandedRowItems(item)" />
      </div>
    </template>
  </AppTable>
</template>

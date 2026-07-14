<script setup>
/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

/**
 * @type {{ item: DisplayField }}
 */
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});

const hasExpandedRow = computed(() => !!props.item.table?.expandedRow);
const isExpandedRowVisible = (item) => {
  if (typeof props.item.table?.isExpandedRowVisible === 'function') {
    return props.item.table.isExpandedRowVisible(item);
  }
  return props.item.table?.expandedRow(item)?.length > 0;
};
</script>

<template>
  <AppTable
    :enable-expand="hasExpandedRow"
    :enable-search="false"
    :headers="props.item.table.headers"
    :items="props.item.value"
    :is-expanded-row-visible="hasExpandedRow ? isExpandedRowVisible : null"
    :server-side="false"
    bordered
    density="compact"
    enable-scroll-button
    hide-details
    hide-no-data
  >
    <template
      v-if="hasExpandedRow"
      #expanded-row="{ item }"
    >
      <div class="py-3">
        <AppDisplayFieldGroup :items="props.item.table.expandedRow(item)" />
      </div>
    </template>
  </AppTable>
</template>

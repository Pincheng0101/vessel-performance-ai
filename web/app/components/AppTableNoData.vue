<script setup>
const props = defineProps({
  columnCount: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <tr>
    <td
      :colspan="props.columnCount"
      class="px-0"
    >
      <template v-if="$slots['no-data']">
        <slot name="no-data" />
      </template>
      <template v-else>
        <span class="d-flex justify-center pa-4">
          {{ $t('__instructionNoResultsFound') }}
        </span>
      </template>
    </td>
  </tr>
</template>

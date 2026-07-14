<script setup>
const props = defineProps({
  slotProps: {
    type: Object,
    default: () => ({}),
  },
  title: {
    type: String,
    required: true,
  },
  tooltip: {
    type: String,
    default: null,
  },
});

const column = computed(() => props.slotProps?.column ?? {});
const onSort = computed(() => props.slotProps?.onSort ?? null);
const sortIcon = computed(() => props.slotProps?.sortIcon ?? null);

const handleSort = () => {
  if (!column.value?.sortable || typeof onSort.value !== 'function') {
    return;
  }

  onSort.value(column.value);
};
</script>

<template>
  <component
    :is="column?.sortable ? 'button' : 'div'"
    class="table-column-header"
    :type="column?.sortable ? 'button' : undefined"
    @click="handleSort"
  >
    <div class="v-data-table-header__content ga-1 text-start">
      <span>{{ props.title }}</span>
      <AppInputTooltip
        v-if="props.tooltip"
        :text="props.tooltip"
        @click.stop
      />
      <v-icon
        v-if="column?.sortable && sortIcon"
        class="v-data-table-header__sort-icon"
        size="small"
      >
        {{ sortIcon }}
      </v-icon>
    </div>
  </component>
</template>

<style lang="scss" scoped>
.table-column-header {
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
}

button.table-column-header {
  cursor: pointer;
}

.v-data-table-header__content {
  display: inline-flex;
  word-break: keep-all;
  white-space: nowrap;
  width: max-content;
}
</style>

<script setup>
const props = defineProps({
  tableElement: {
    type: Object,
    required: true,
  },
});

const state = reactive({
  scrollable: true,
  scrollableObserver: null,
  tableHeadHeight: 0,
  tableBodyHeight: 0,
});

const tableElement = computed(() => props.tableElement);
const tableWrapperElement = computed(() => tableElement.value?.querySelector(':scope > .v-table__wrapper'));
const tableHeadElement = computed(() => tableWrapperElement.value?.querySelector('thead'));
const tableBodyElement = computed(() => tableWrapperElement.value?.querySelector('tbody'));

const updateScrollable = () => {
  state.scrollable = Math.ceil(tableWrapperElement.value.scrollLeft) + tableWrapperElement.value.clientWidth < tableWrapperElement.value.scrollWidth;
  updateHeight();
};

const handleClick = () => {
  scrollUtils.scrollTo({
    left: tableWrapperElement.value.scrollWidth,
    target: tableWrapperElement.value,
  });
};

const updateHeight = () => {
  state.tableBodyHeight = tableBodyElement.value?.offsetHeight;
  state.tableHeadHeight = tableHeadElement.value?.offsetHeight;
};

onMounted(() => {
  if (!tableElement.value || !tableWrapperElement.value) return;
  updateHeight();
  state.scrollableObserver = new ResizeObserver(updateScrollable);
  state.scrollableObserver.observe(tableWrapperElement.value);
  tableWrapperElement.value.addEventListener('scroll', updateScrollable);
});

onBeforeUnmount(() => {
  state.scrollableObserver.disconnect();
  tableWrapperElement.value.removeEventListener('scroll', updateScrollable);
});
</script>

<template>
  <AppIconButton
    icon="mdi-menu-right"
    :height="state.tableBodyHeight"
    :width="12"
    icon-size="x-large"
    color="tableScrollButton"
    class="position-absolute right-0 bottom-0 d-flex justify-center align-center cursor-pointer z-index-1 px-0"
    :class="{ active: state.scrollable }"
    :rounded="false"
    variant="flat"
    size="small"
    @click="handleClick"
  />
</template>

<style lang="scss" scoped>
.v-btn {
  opacity: 0;
  top: v-bind('`${state.tableHeadHeight}px`');
  transition: opacity 0.25s, visibility 0.25s;
  visibility: hidden;
  &.active {
    opacity: 1;
    visibility: visible;
  }
}
</style>

<script setup>
const props = defineProps({
  selectableObjects: {
    type: Array,
    default: () => [],
  },
  selectedObjects: {
    type: Array,
    default: () => [],
  },
  currentObjects: {
    type: Array,
    default: () => [],
  },
  onClick: {
    type: Function,
    required: true,
  },
});

const isVisible = defineModel('isVisible', {
  type: Boolean,
  default: false,
});

const isAllSelected = computed(() => props.selectedObjects.length === props.selectableObjects.length);
</script>

<template>
  <v-fade-transition
    :duration="200"
    mode="out-in"
  >
    <v-sheet
      v-if="isVisible"
      class="d-flex justify-center align-center pa-2 ga-2"
      color="backgroundScale1"
    >
      {{ isAllSelected ? $t('__messageSelectAllFilesInFolder', { count: numUtils.format(props.selectedObjects.length) }) : $t('__messageSelectAllFilesOnPage', { count: numUtils.format(props.currentObjects.length) }) }}
      <AppButton
        :text="isAllSelected ? $t('__titleDeselectAll') : `${$t('__actionSelectAllFiles', { count: numUtils.format(props.selectableObjects.length) })}`"
        rounded="regular"
        color="primaryLight"
        variant="text"
        @click="onClick(isAllSelected)"
      />
    </v-sheet>
  </v-fade-transition>
</template>

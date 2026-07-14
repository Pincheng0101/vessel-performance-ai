<script setup>
import { RuntimeConstant } from '~/constants';

const props = defineProps({
  storage: {
    type: Object,
    required: true,
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});

const commonPrefix = defineModel('commonPrefix', {
  type: String,
  default: '',
});

const breadcrumbs = computed(() => {
  const items = [props.storage?.storageName];
  if (commonPrefix.value) {
    items.push(...commonPrefix.value.split('/').filter(Boolean));
  }
  return items;
});

const handleClick = (i) => {
  if (i === breadcrumbs.value.length - 1) return;
  const partial = breadcrumbs.value.slice(1, i + 1).join('/');
  commonPrefix.value = partial;
  props.onClick();
};
</script>

<template>
  <v-sheet
    class="d-flex align-center px-5 pt-3 ga-2"
    color="backgroundScale1"
  >
    <v-icon
      :icon="RuntimeConstant.Type.COMMON_PREFIX.icon"
      color="primary"
    />
    <div class="text-body-2">
      <template
        v-for="(crumb, i) in breadcrumbs"
        :key="i"
      >
        <span
          :class="[i === breadcrumbs.length - 1 ? [] : ['text-primary', 'cursor-pointer']]"
          @click="() => handleClick(i)"
        >
          {{ crumb }}
        </span>
        <span
          v-if="i !== breadcrumbs.length - 1"
          class="px-2"
        >/</span>
      </template>
    </div>
  </v-sheet>
</template>

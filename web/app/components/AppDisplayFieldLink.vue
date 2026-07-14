<script setup>
/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

/**
 * @type {{ item: DisplayField }}
 */
const props = defineProps({
  index: {
    type: Number,
    default: 0,
  },
  item: {
    type: Object,
    required: true,
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});

const originalValue = computed(() => {
  return Array.isArray(props.item.value) ? props.item.value[props.index] : props.item.value;
});

const link = computed(() => {
  if (!props.item.link) return;
  return typeof props.item.link === 'function'
    ? props.item.link(originalValue.value, props.index)
    : props.item.link;
});

const handleClick = (event) => {
  // Only stop propagation if the item is clickable
  if (props.item.isClickable) {
    event.stopPropagation();
  }
  props.onClick(event);
};
</script>

<template>
  <div
    class="d-flex align-center ga-1"
    :class="{
      'text-primary cursor-pointer': props.item.isClickable,
    }"
    @click="handleClick"
  >
    <template v-if="link">
      <NuxtLink
        :href="link.href"
        :target="link.target"
        :rel="link.target === '_blank' ? 'noopener noreferrer' : undefined"
        class="text-decoration-none d-flex align-center ga-1"
      >
        <slot />
        <template v-if="link.target === '_blank'">
          <v-icon
            icon="mdi-open-in-new"
            size="x-small"
          />
        </template>
      </NuxtLink>
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

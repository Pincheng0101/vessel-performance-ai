<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  module: {
    type: String,
    required: true,
  },
  iconSize: {
    type: [Number, String],
    default: 24,
  },
  maxIcons: {
    type: Number,
    default: 4,
  },
  wrap: {
    type: Boolean,
    default: false,
  },
});

const typeIcons = computed(() => {
  const resourceType = findField(ResourceConstant.Type, props.module, 'type', 'module');
  if (!resourceType) return;
  const allIcons = Object.values(resourceType)
    .filter(type => type.iconPath);
  const visibleIcons = allIcons.slice(0, props.maxIcons);
  const remainingIcons = allIcons.slice(props.maxIcons);
  return { visibleIcons, remainingIcons };
});
</script>

<template>
  <div
    v-if="typeIcons"
    class="d-flex align-center"
    :class="{ 'flex-wrap ga-1': props.wrap }"
  >
    <AppImageIcon
      v-for="(icon, index) in typeIcons.visibleIcons"
      :key="index"
      :src="icon.iconPath"
      :width="props.iconSize"
      :height="props.iconSize"
      :tooltip="icon.title"
      tooltip-location="top"
    />
    <template v-if="typeIcons.remainingIcons.length > 0">
      <AppTooltip
        :text="typeIcons.remainingIcons.map(icon => icon.title).join(', ')"
        location="top"
      >
        <template #default="{ props: p }">
          <v-sheet
            :width="props.iconSize"
            :height="props.iconSize"
            color="white"
            rounded="sm"
            v-bind="p"
            class="d-flex justify-center align-center text-caption remaining-icons-indicator"
          >
            +{{ typeIcons.remainingIcons.length }}
          </v-sheet>
        </template>
      </AppTooltip>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.remaining-icons-indicator {
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
}
</style>

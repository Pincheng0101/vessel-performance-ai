<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    required: false,
  },
  onRefresh: {
    type: Function,
    default: null,
  },
});
</script>

<template>
  <div class="mr-1">
    <template v-if="props.loading">
      <AppProgressCircular
        :size="20"
        :width="2"
      />
    </template>
    <template v-else>
      <template v-if="onRefresh">
        <v-icon
          icon="mdi-refresh"
          @click.stop="props.onRefresh"
        />
        <AppTooltip
          :text="$t('__actionRefresh')"
          activator="parent"
        />
      </template>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.v-icon {
  opacity: var(--v-medium-emphasis-opacity);
}
</style>

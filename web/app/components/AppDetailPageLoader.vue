<script setup>
const props = defineProps({
  showTitle: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.showTitle">
    <AppSkeletonLoader
      :width="200"
      background-color="transparent"
      type="heading"
    />
    <AppSkeletonLoader
      :width="100"
      background-color="transparent"
      type="heading"
    />
  </template>
  <AppDetailsCard :title="props.title">
    <template #body>
      <v-row>
        <v-col :cols="6">
          <AppSkeletonLoader type="paragraph@3" />
        </v-col>
        <v-col :cols="6">
          <AppSkeletonLoader type="paragraph@3" />
        </v-col>
      </v-row>
    </template>
  </AppDetailsCard>
</template>

<style lang="scss" scoped>
:deep() {
  .v-skeleton-loader__heading,
  .v-skeleton-loader__text,
  .v-skeleton-loader__chip {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>

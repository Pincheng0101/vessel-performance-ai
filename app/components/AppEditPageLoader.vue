<template>
  <AppForm>
    <template #body>
      <AppSkeletonLoader type="paragraph@5" />
    </template>
  </AppForm>
</template>

<style lang="scss" scoped>
:deep() {
  .v-skeleton-loader__text {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>

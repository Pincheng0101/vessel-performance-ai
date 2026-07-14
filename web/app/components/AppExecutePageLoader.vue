<script setup>
</script>

<template>
  <AppForm :form-title="$t('__titleStartExecution')">
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
  </AppForm>
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

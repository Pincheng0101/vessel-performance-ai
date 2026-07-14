<template>
  <v-sheet
    color="backgroundScale1"
    rounded
    class="mb-2 py-1"
  >
    <slot />
  </v-sheet>
</template>

<style lang="scss" scoped>
.v-sheet {
  > div {
    margin-bottom: 0 !important;
  }
}
</style>

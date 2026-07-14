<template>
  <v-menu>
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        icon="mdi-plus"
        variant="text"
      />
    </template>
    <v-card
      :elevation="1"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <slot />
      </v-list>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
:deep(.v-list-item__prepend .v-icon) {
  font-size: 20px;
}
</style>

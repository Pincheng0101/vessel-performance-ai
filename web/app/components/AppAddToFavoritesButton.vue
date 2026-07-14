<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    default: '',
  },
  persistent: {
    type: Boolean,
    default: false,
  },
});

const favoriteItemStore = useFavoriteItemStore();

const state = reactive({
  isFavorite: favoriteItemStore.isFavorite(props.item),
});

const toggle = async () => {
  // For better visual experience
  await delay(250);
  state.isFavorite = !state.isFavorite;
  favoriteItemStore.toggleFavorite(props.item, props.type);
};
</script>

<template>
  <v-sheet
    color="transparent"
    :min-width="32"
    class="d-flex justify-center"
  >
    <template v-if="state.isFavorite">
      <AppIconButton
        :tooltip="$t('__actionRemoveFromFavorite')"
        icon-color="orange-lighten-1"
        icon="mdi-bookmark"
        variant="text"
        @click="toggle"
      />
    </template>
    <template v-else-if="props.persistent">
      <AppIconButton
        :tooltip="$t('__actionAddToFavorite')"
        icon-color="text"
        icon="mdi-bookmark-outline"
        variant="text"
        class="inactive"
        @click="toggle"
      />
    </template>
  </v-sheet>
</template>

<style lang="scss" scoped>
.inactive {
  :deep(.v-icon) {
    opacity: var(--v-medium-emphasis-opacity);
  }
}
</style>

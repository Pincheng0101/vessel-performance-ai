<script setup>
const props = defineProps({
  preset: {
    type: Object,
    required: true,
  },
  onSelect: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <v-card
    class="cursor-pointer h-100 bg-backgroundScale2"
    variant="tonal"
    min-height="100"
    @click="props.onSelect(props.preset)"
  >
    <v-card-text class="d-flex align-start ga-3 pa-4">
      <div class="rounded flex-shrink-0 d-flex align-center justify-center preset-icon">
        <AppImageIcon
          v-if="props.preset.iconPath"
          :src="props.preset.iconPath"
          :width="44"
          :height="44"
          class="ma-0"
          :show-shadow="false"
        />
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span class="text-subtitle-2 font-weight-bold">
            {{ props.preset.name }}
          </span>
        </div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ $t(props.preset.description) }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.preset-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
}
</style>

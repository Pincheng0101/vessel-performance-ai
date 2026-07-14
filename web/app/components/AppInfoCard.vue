<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: '',
  },
  iconPath: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  subTitle: {
    type: String,
    default: '',
  },
  instruction: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-card
    variant="flat"
    class="pa-8 d-flex flex-column justify-center"
  >
    <v-sheet>
      <v-card-text>
        <div class="d-flex flex-column align-center">
          <template v-if="props.icon">
            <v-icon
              :size="36"
              color="primary"
            >
              {{ props.icon }}
            </v-icon>
          </template>
          <template v-else-if="props.iconPath">
            <AppImageIcon
              :src="props.iconPath"
              class="mr-0"
              mask-color="primary"
            />
          </template>
          <template v-if="props.title">
            <div class="text-h5 font-weight-bold my-4">
              {{ strUtils.addSpacesAroundAscii(props.title) }}
            </div>
          </template>
          <template v-if="props.subTitle">
            <div class="text-h6 font-weight-bold mb-4">
              {{ strUtils.addSpacesAroundAscii(props.subTitle) }}
            </div>
          </template>
          <v-sheet
            v-if="props.instruction"
            :max-width="480"
            class="text-body-1 text-center white-space-pre-line"
          >
            {{ strUtils.addSpacesAroundAscii(props.instruction) }}
          </v-sheet>
        </div>
      </v-card-text>
      <v-card-actions
        v-if="$slots.actions"
        class="d-flex justify-center"
      >
        <slot name="actions" />
      </v-card-actions>
    </v-sheet>
  </v-card>
</template>

<style lang="scss" scoped>
.v-sheet {
  background-color: inherit;
}
</style>

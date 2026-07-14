<script setup>
const props = defineProps({
  width: {
    type: Number,
    default: 400,
  },
  title: {
    type: String,
    default: '',
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  expandForm: false,
});

const formWidth = computed(() => {
  return props.width * (state.expandForm ? 2 : 1);
});
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between text-body-1">
      <span class="text-truncate">
        {{ strUtils.addSpacesAroundAscii(props.title) }}
      </span>
      <v-spacer />
      <div class="d-flex align-center flex-end ga-1">
        <slot name="actions" />
        <div>
          <AppIconButton
            :tooltip="state.expandForm ? $t('__actionMinimizeWindow') : $t('__actionMaximizeWindow')"
            :icon="state.expandForm ? 'mdi-window-minimize' : 'mdi-window-maximize'"
            aria-label="Resize Modal"
            variant="text"
            @click="state.expandForm = !state.expandForm"
          />
          <AppIconButton
            :tooltip="$t('__actionClose')"
            aria-label="Close Modal"
            icon="mdi-close"
            variant="text"
            @click="props.onCancel"
          />
        </div>
      </div>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <slot name="body" />
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.v-card {
  width: v-bind('`${formWidth}px`');
  transition: width 0.25s;
}
</style>

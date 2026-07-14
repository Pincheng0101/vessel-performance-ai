<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const state = reactive({
  tab: null,
});
</script>

<template>
  <v-expansion-panels
    v-model="state.tab"
    flat
  >
    <v-expansion-panel bg-color="transparent">
      <v-expansion-panel-title class="px-0">
        <div class="d-flex align-center ga-2">
          <AppMarkdown
            :text="props.title"
            inline
            :class="{ 'is-loading': props.loading }"
          />
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text class="px-0">
        <slot />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style lang="scss" scoped>
.v-expansion-panel {
  background-color: transparent;
  > button {
    padding: 0;
    max-width: fit-content;
  }
}
.v-expansion-panel-title {
  background: transparent !important;
  font-size: 1rem;
  min-height: 24px !important;
  line-height: 1.5rem;
}
:deep(){
  .v-expansion-panel-title__icon {
    color: grey;
    margin-left: 4px;
  }
  .v-expansion-panel-text__wrapper {
    padding: 16px 0 !important;
  }
}
.is-loading {
  animation: titlePulse 1.2s infinite ease-in-out;
}
@keyframes titlePulse {
  0%, 80%, 100% {
    opacity: 0.5;
  }
  40% {
    opacity: 1;
  }
}
</style>

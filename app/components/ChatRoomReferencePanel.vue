<script setup>
const props = defineProps({
  references: {
    type: Array,
    default: () => [],
  },
  messageId: {
    type: String,
    default: null,
  },
  selectedReferenceIndex: {
    type: Number,
    default: null,
  },
  onReferenceClick: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const containerRef = ref(null);

const state = reactive({
  selectedReferenceIndex: null,
});

watch(() => [props.messageId, props.selectedReferenceIndex], async (after) => {
  // Wait for drawer to open and DOM to update
  await nextTick();

  const [, selectedReferenceIndex] = after;
  state.selectedReferenceIndex = selectedReferenceIndex;

  if (!containerRef.value) return;
  const scrollContainer = containerRef.value.$el.closest('.v-card-text');
  const element = containerRef.value.$el.querySelector(`.reference-${state.selectedReferenceIndex}`);

  if (scrollContainer && element) {
    // For better visual experience
    await delay(500);
    scrollUtils.scrollTo({
      top: element.offsetTop,
      target: scrollContainer,
    });
  }
});
</script>

<template>
  <AppSlidePanel
    v-model="model"
    :title="$t('__titleReferences')"
    :width="400"
  >
    <v-expansion-panels
      ref="containerRef"
      v-model="state.selectedReferenceIndex"
      flat
      tile
      @update:model-value="onReferenceClick"
    >
      <template
        v-for="(result, i) in props.references"
        :key="result.index"
      >
        <v-expansion-panel
          :value="result.index"
          :class="`reference-${result.index}`"
        >
          <v-expansion-panel-title class="text-body-1 pa-4">
            <div class="d-flex ga-2">
              <p class="text-primary font-weight-medium flex-shrink-0">
                {{ result.index }}.
              </p>
              <p class="text-truncate-2 flex-grow-1 pr-2">
                {{ result.snippet }}
              </p>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="text-body-1">
            <div class="d-flex ga-2">
              <p class="flex-shrink-0 opacity-0">
                {{ result.index }}.
              </p>
              <p class="text-truncate-2 flex-grow-1 pr-2">
                <ChatRoomReferenceDocument
                  :knowledge-base-id="result.knowledgeBaseId"
                  :doc-id="result.docId"
                />
              </p>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-divider v-if="i < props.references.length - 1" />
      </template>
    </v-expansion-panels>
  </AppSlidePanel>
</template>

<style lang="scss" scoped>
.v-expansion-panel-title {
  line-height: 1.5;
}
.v-expansion-panel-title--active {
  background-color: rgba(var(--v-theme-backgroundScale3), 0.5);
}
.v-expansion-panel-title:hover {
  background-color: rgba(var(--v-theme-backgroundScale3));
}
:deep() {
  label {
    font-size: 0.875rem;
  }
  .v-expansion-panel-text__wrapper {
    padding: 16px;
  }
}
</style>

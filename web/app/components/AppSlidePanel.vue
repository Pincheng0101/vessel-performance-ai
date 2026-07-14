<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  width: {
    type: Number,
    default: 600,
  },
  backgroundColor: {
    type: String,
    default: 'background',
  },
  // Let the body fill the remaining card height so embedded content can resolve
  // `height: 100%` (e.g. a chat that pins its input to the bottom).
  fillBody: {
    type: Boolean,
    default: false,
  },
  fullHeight: {
    type: Boolean,
    default: false,
  },
  expandedFullHeight: {
    type: Boolean,
    default: false,
  },
  gradientBorder: {
    type: Boolean,
    default: false,
  },
});

const { smAndDown } = useDisplay();

const model = defineModel({
  type: Boolean,
  default: false,
});

const state = reactive({
  expanded: false,
});

const isFullHeight = computed(() => props.fullHeight || (props.expandedFullHeight && state.expanded));

const closePanel = () => {
  model.value = false;
};

watch(model, (open) => {
  if (!open) {
    state.expanded = false;
  }
});
</script>

<template>
  <Transition name="slide">
    <!-- Height: 100dvh - app header - padding - footer - offset -->
    <v-sheet
      v-if="model"
      color="transparent"
      :width="props.width * (state.expanded ? 2 : 1)"
      :class="['panel position-fixed', { 'fullscreen': smAndDown, 'full-height': isFullHeight }]"
      :height="isFullHeight ? '100dvh' : 'calc(100dvh - 64px - 24px - 24px - 24px)'"
    >
      <div :class="['panel-card-frame h-100', { 'panel-card-gradient-border': props.gradientBorder }]">
        <v-card class="panel-card h-100 d-flex flex-column">
          <v-card-title class="d-flex justify-space-between align-center pr-3">
            {{ props.title }}
            <div class="d-flex ga-1">
              <slot name="header-actions" />
              <AppIconButton
                :icon="state.expanded ? 'mdi-window-minimize' : 'mdi-window-maximize'"
                variant="text"
                @click="() => {
                  state.expanded = !state.expanded;
                }"
              />
              <AppIconButton
                icon="mdi-close"
                variant="text"
                @click="closePanel"
              />
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text
            class="pa-0 overflow-auto"
            :class="{ 'panel-body flex-1-1': props.fillBody }"
          >
            <slot />
          </v-card-text>
        </v-card>
      </div>
    </v-sheet>
  </Transition>
</template>

<style lang="scss" scoped>
// Fill the remaining card height so embedded content can resolve `height: 100%`.
.panel-body {
  min-height: 0;
}
.panel {
  top: calc(64px + 24px); // header + padding
  right: 0;
  z-index: 10;
  transition: width 0.25s ease;

  &.full-height {
    top: 0;
    z-index: calc(1005 + 1); // Header index + 1
  }
}
.panel-card-frame {
  position: relative;
  z-index: 0;
  overflow: hidden;
  border-radius: 8px 0 0 8px;
  transform: translateZ(0);
}
.panel-card {
  overflow: hidden;
  border-radius: 8px 0 0 8px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.panel-card-gradient-border {
  --panel-gradient: linear-gradient(135deg, #5b8def 0%, rgb(var(--v-theme-primary)) 50%, #f0a0b8 100%);

  &::before {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    padding: 2px;
    background: var(--panel-gradient);
    content: '';
    pointer-events: none;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
}
.fullscreen {
  .panel-card-frame {
    border-radius: 0;
  }

  .panel-card-gradient-border {
    &::before {
      display: none;
    }
  }
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>

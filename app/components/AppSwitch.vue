<script setup>
const props = defineProps({
  defaultValue: {
    type: Boolean,
    default: false,
  },
  density: {
    type: String,
    default: 'compact',
  },
  size: {
    type: String,
    default: '',
  },
  freezed: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: [Boolean, String],
  default: false,
});

const state = reactive({
  isShaking: false,
});

const handleClick = async () => {
  if (props.freezed) {
    state.isShaking = true;
    await delay(500);
    state.isShaking = false;
  }
};

if (props.defaultValue) {
  model.value = props.defaultValue;
}
</script>

<template>
  <v-switch
    v-model="model"
    :density="props.density"
    :hint="props.hint"
    color="primary"
    persistent-hint
    :class="{
      'xx-small': props.size === 'xx-small',
      'shaking': state.isShaking,
      'opacity-70': props.freezed,
    }"
    @click="handleClick"
  >
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
  </v-switch>
</template>

<style lang="scss" scoped>
:deep() {
  .v-selection-control {
    margin-left: 4px;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.shaking {
  // Magic numbers from popular CSS shake patterns
  animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) infinite;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.xx-small {
  :deep() {
    .v-switch {
      display: flex;
      align-items: center;
    }
    .v-selection-control {
      min-height: 0;
    }
    .v-selection-control__wrapper {
      height: 12px;
    }
    .v-switch__thumb {
      height: 12px;
      width: 12px;
    }
    .v-switch__track {
      height: 8px;
      min-width: 20px;
    }
    .v-selection-control__input {
      height: 16px;
      width: 16px;
    }
    .v-selection-control.v-selection-control--density-compact {
      --v-selection-control-size: 24px;
      .v-selection-control__input {
        transform: translateX(-6px);
      }
      &.v-selection-control--dirty {
        .v-selection-control__input {
          transform: translateX(6px);
        }
      }
    }
  }
}
</style>

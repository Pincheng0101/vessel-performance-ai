<script setup>
/**
 * @import { Step } from '~/models/ui/stepper';
 */

/**
 * @type {{ steps: Step[] }}
 */
const props = defineProps({
  steps: {
    type: Array,
    required: true,
  },
  stepperTitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: null,
  },
  iconPath: {
    type: String,
    default: null,
  },
  isAllStepsDisabled: {
    type: Boolean,
    default: false,
  },
  isPreviousStepsDisabledOnFinalStep: {
    type: Boolean,
    default: false,
  },
  isPreviousStepButtonDisabled: {
    type: Boolean,
    default: false,
  },
  isNextStepButtonDisabled: {
    type: Boolean,
    default: false,
  },
});

const snackbarStore = useSnackbarStore();

const model = defineModel({
  type: Number,
  default: undefined,
});

const state = reactive({
  step: 1,
  disabledSteps: new Set(props.steps.filter(step => step.value !== 1).map(step => step.value)),
  isLoading: false,
  onValidateErrorMap: {},
  onNextErrorMap: {},
});

watch(() => state.step, (after) => {
  model.value = after;
});

const goToPreviousStep = () => {
  if (state.step <= 1) return;
  state.step--;
  scrollUtils.scrollTo();
};

const goToNextStep = () => {
  if (state.step >= props.steps.length) return;
  state.step++;
  state.disabledSteps.delete(state.step);
  scrollUtils.scrollTo();

  if (state.step === props.steps.length && props.isPreviousStepsDisabledOnFinalStep) {
    for (let i = 1; i < props.steps.length; i++) {
      state.disabledSteps.add(props.steps[i - 1].value);
    }
  }
};

const submit = async (value) => {
  const step = props.steps.find(s => s.value === value);
  state.onValidateErrorMap[step.value] = null;
  state.onNextErrorMap[step.value] = null;
  snackbarStore.setMessage(null);

  state.isLoading = true;
  if (step.onValidate) {
    try {
      await step.onValidate();
    } catch (error) {
      state.onValidateErrorMap[step.value] = error.message || error;
      state.isLoading = false;
      return;
    }
  }
  if (step.onNext) {
    try {
      await step.onNext();
    } catch (error) {
      state.onNextErrorMap[step.value] = error.message || error;
      state.isLoading = false;
      return;
    } finally {
      // For better visual experience
      await delay(1000);
    }
  }
  state.isLoading = false;
  goToNextStep();
};

const rerun = async (progressItem) => {
  state.isLoading = true;
  state.onNextErrorMap[state.step] = null;

  const step = props.steps.find(s => s.value === state.step);
  const startIndex = step.progressBoardItems.findIndex(i => i.key === progressItem.key);
  const itemsToRun = step.progressBoardItems.slice(startIndex);

  try {
    for (const item of itemsToRun) {
      await item.onRun();
    }
    // For better visual experience
    await delay(1000);
  } catch (error) {
    state.onNextErrorMap[state.step] = error.message || error;
    return;
  } finally {
    state.isLoading = false;
  }

  goToNextStep();
};
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <template v-if="props.icon">
        <v-icon
          color="primary"
          size="small"
          class="mr-2"
        >
          {{ props.icon }}
        </v-icon>
      </template>
      <template v-else-if="props.iconPath">
        <AppImageIcon
          :src="props.iconPath"
          mask-color="primary"
        />
      </template>
      <span class="text-truncate">
        {{ strUtils.addSpacesAroundAscii(props.stepperTitle) }}
      </span>
    </v-card-title>
    <v-stepper
      v-model="state.step"
      bg-color="backgroundScale2"
      :elevation="1"
      class="overflow-visible"
    >
      <v-stepper-header>
        <template
          v-for="(step, i) in props.steps"
          :key="i"
        >
          <v-stepper-item
            color="primary"
            class="px-5"
            :title="step.title"
            :subtitle="state.onValidateErrorMap[step.value] || state.onNextErrorMap[step.value] || step.subtitle"
            :complete="state.step > step.value"
            :value="step.value"
            :error="!!(state.onValidateErrorMap[step.value] || state.onNextErrorMap[step.value])"
            :disabled="(step.value !== state.step && (state.isLoading || state.disabledSteps.has(step.value))) || props.isAllStepsDisabled"
            editable
          />
          <template v-if="i !== props.steps.length - 1">
            <template v-if="state.isLoading && state.step === step.value">
              <AppProgressLinear
                class="w-100"
                :height="4"
                :rounded="false"
                :chunk-width="2"
                indeterminate
              />
            </template>
            <template v-else>
              <v-divider class="mx-1" />
            </template>
          </template>
        </template>
      </v-stepper-header>
      <v-stepper-window class="pa-0">
        <v-stepper-window-item
          v-for="(step, i) in props.steps"
          :key="step.value"
          :value="step.value"
          :transition="false"
          class="w-100"
        >
          <v-card elevation="0">
            <v-card-text>
              <template v-if="state.isLoading || state.onNextErrorMap[step.value]">
                <template v-if="step.progressBoardItems?.length > 0">
                  <AppProgressBoard
                    :items="step.progressBoardItems"
                    :on-rerun="rerun"
                  />
                </template>
                <template v-else>
                  <AppProgressLinear
                    :height="4"
                    indeterminate
                    :rounded="false"
                    :message="step.loadingMessage || $t('__fieldStatusProcessing')"
                    class="w-100"
                  />
                </template>
                <template v-if="state.onNextErrorMap[step.value]">
                  <div class="d-flex align-center ga-2">
                    <slot
                      name="step-actions-left"
                      :is-loading="state.isLoading"
                    />
                    <v-spacer />
                    <AppButton
                      v-if="i > 0"
                      color="actionButton"
                      :text="$t('__actionGoToPreviousStep')"
                      width="100"
                      @click="goToPreviousStep"
                    />
                    <AppButton
                      color="primary"
                      :text="step.i18nAction ? $t(step.i18nAction) : (i === props.steps.length - 1 ? $t('__actionSave') : $t('__actionGoToNextStep'))"
                      width="100"
                      disabled
                    />
                  </div>
                </template>
              </template>
              <template v-else>
                <slot :name="`step-content-${step.value}`" />
                <template v-if="!step.hideButtons">
                  <div class="d-flex align-center ga-2">
                    <slot
                      name="step-actions-left"
                      :is-loading="state.isLoading"
                    />
                    <v-spacer />
                    <AppButton
                      v-if="i > 0"
                      color="actionButton"
                      :text="$t('__actionGoToPreviousStep')"
                      width="100"
                      :disabled="props.isPreviousStepButtonDisabled"
                      @click="goToPreviousStep"
                    />
                    <AppButton
                      color="primary"
                      :text="step.i18nAction ? $t(step.i18nAction) : (i === props.steps.length - 1 ? $t('__actionSave') : $t('__actionGoToNextStep'))"
                      width="100"
                      :disabled="props.isNextStepButtonDisabled"
                      @click="submit(step.value)"
                    />
                  </div>
                </template>
              </template>
            </v-card-text>
          </v-card>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>
  </v-card>
</template>

<style lang="scss" scoped>
:deep(.v-stepper-header) {
  background-color: rgba(var(--v-theme-backgroundScale2));
  box-shadow: none;
  border-bottom: 1px solid rgba(var(--v-theme-inputBorder));
}
:deep(.v-window) {
  padding: 20px;
  margin: 0;
  .v-window__container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }
}
:deep(.v-stepper-item__title) {
  text-align: start;
  margin-bottom: 4px;
}
.v-window-x-transition-enter-active,
.v-window-x-transition-leave-active,
.v-window-x-reverse-transition-enter-active,
.v-window-x-reverse-transition-leave-active {
  transform: none !important;
  transition: none !important;
}
</style>

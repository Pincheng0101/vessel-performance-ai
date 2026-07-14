<script setup>
import { IconConstant, StateConstant } from '~/constants';
import { StateDefinitionFactory } from '~/models/workflow/state';

/**
 * @import { StateDefinition } from '~/models/workflow/state'
 */

/**
 * @type {{ stateDefinition: StateDefinition }}
 */
const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  inputSchema: {
    type: Object,
    default: null,
  },
  formTitle: {
    type: String,
    default: '',
  },
  formTitleIcon: {
    type: String,
    default: '',
  },
  formTitleIconBackground: {
    type: String,
    default: IconConstant.Color.ACTION,
  },
  formTitleIconPath: {
    type: String,
    default: '',
  },
  formTitleIconPathMaskColor: {
    type: String,
    default: '',
  },
  stateDefinition: {
    type: Object,
    default: null,
  },
  executable: {
    type: Boolean,
    default: false,
  },
  showTabs: {
    type: Boolean,
    default: true,
  },
  width: {
    type: Number,
    default: 400,
  },
  isFormGroupValid: {
    type: Boolean,
    default: true,
  },
  onStateFormClose: {
    type: Function,
    default: () => {},
  },
  onStateFormValidate: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const cardRef = ref(null);
const formMainRef = ref(null);
const formConfigRef = ref(null);
const formInputOutputRef = ref(null);
const formErrorHandlingRef = ref(null);
const cardTextRef = ref(null);

const state = reactive({
  showDefinition: false,
  expandForm: false,
  isFormValid: true,
});

const formWidth = computed(() => {
  return props.width * (state.expandForm ? 2 : 1);
});

const tabs = computed(() => [
  {
    value: 'config',
    title: t('__titleConfig'),
  },
  {
    value: 'input-output',
    title: t('__titleInputOutput'),
    hidden: !props.stateDefinition.inputOutput,
  },
  {
    value: 'error-handling',
    title: t('__titleErrorHandling'),
    hidden: !props.stateDefinition.errorHandling,
  },
]);

defineExpose({
  getMainForm() {
    return formMainRef.value;
  },
  getConfigForm() {
    return formConfigRef.value;
  },
  getErrorHandlingForm() {
    return formErrorHandlingRef.value;
  },
});
</script>

<template>
  <v-card
    ref="cardRef"
    aria-label="Workflow State Form"
    class="wrapper"
  >
    <v-card-title class="d-flex align-center justify-space-between">
      <!-- Max Width: form width - switch width - button width - padding -->
      <AppTitle
        :font-size="16"
        :icon-background="props.formTitleIconBackground"
        :icon="props.formTitleIcon"
        :icon-path="props.formTitleIconPath"
        :icon-path-mask-color="props.formTitleIconPathMaskColor"
        :max-width="formWidth - 100 - 32 * 3 - 40"
        :text="props.formTitle"
        font-weight="bold"
      >
        <template
          v-if="!props.isFormGroupValid"
          #append
        >
          <v-icon
            color="error"
            icon="mdi-alert"
            size="x-small"
            class="mx-2"
          />
        </template>
      </AppTitle>
      <v-spacer />
      <div class="d-flex flex-end align-center ga-1">
        <v-sheet
          :width="100"
          color="transparent"
          class="d-flex justify-end align-center ga-1"
        >
          <template v-if="props.stateDefinition">
            <AppSwitch
              id="show-definition"
              v-model="state.showDefinition"
              aria-label="Show Definition"
              density="compact"
              size="xx-small"
              hide-details
              class="mb-0"
            />
            <AppInputLabel
              :label="$t('__fieldDefinition')"
              class="text-caption mb-0"
              for="show-definition"
            />
          </template>
        </v-sheet>
        <div>
          <WorkflowModal
            v-if="props.executable && props.stateDefinition"
            :target="cardRef"
          >
            <template #activator="{ toggle }">
              <AppIconButton
                aria-label="Test Action"
                icon="mdi-play-circle"
                variant="text"
                :tooltip="$t('__actionWorkflowActionTest')"
                @click="async () => {
                  await props.onStateFormValidate({ executable: true });
                  await nextTick();
                  if (!props.isFormGroupValid) return;
                  toggle();
                }"
              />
            </template>
            <template #body="{ onCancel }">
              <WorkflowActionExecutionModalCard
                :state-definition="props.stateDefinition"
                :on-cancel="onCancel"
              />
            </template>
          </WorkflowModal>
          <WorkflowModal
            v-if="props.node?.type === StateConstant.PseudoType.START.value"
            :target="cardRef"
          >
            <template #activator="{ toggle }">
              <AppIconButton
                aria-label="Set Sample Input"
                icon="mdi-play-circle"
                variant="text"
                :tooltip="$t('__tooltipWorkflowSetSampleInput')"
                @click="toggle"
              />
            </template>
            <template #body="{ onCancel }">
              <WorkflowSampleInputModalCard
                :input-schema="props.inputSchema"
                :on-cancel="onCancel"
              />
            </template>
          </WorkflowModal>
          <AppIconButton
            :tooltip="state.expandForm ? t('__actionMinimizeWindow') : t('__actionMaximizeWindow')"
            :icon="state.expandForm ? 'mdi-window-minimize' : 'mdi-window-maximize'"
            variant="text"
            @click="() => state.expandForm = !state.expandForm"
          />
          <AppIconButton
            :tooltip="t('__actionClose')"
            icon="mdi-close"
            variant="text"
            @click="async () => {
              if (props.stateDefinition && !props.stateDefinition.name) return;
              await props.onStateFormValidate();
              props.onStateFormClose();
            }"
          />
        </div>
      </div>
    </v-card-title>
    <v-divider />
    <v-card-text
      ref="cardTextRef"
      :class="{ 'show-definition': state.showDefinition }"
    >
      <template v-if="props.stateDefinition && state.showDefinition">
        <AppDisplayFieldGroup
          :items="[
            {
              title: $t('__fieldDefinition'),
              value: StateDefinitionFactory.toAsl(props.stateDefinition),
              isJsonCode: true,
            },
          ]"
        />
      </template>
      <template v-if="props.showTabs">
        <div v-show="!state.showDefinition">
          <AppTabs
            :append-query="false"
            :height="40"
            :items="tabs"
            show-divider
          >
            <template #config>
              <v-form
                ref="formConfigRef"
                @submit.prevent=""
              >
                <slot name="config-fields" />
              </v-form>
            </template>
            <template
              v-if="props.stateDefinition.inputOutput"
              #input-output
            >
              <v-form
                ref="formInputOutputRef"
                @submit.prevent=""
              >
                <slot name="input-output-fields" />
              </v-form>
            </template>
            <template
              v-if="props.stateDefinition.errorHandling"
              #error-handling
            >
              <v-form
                ref="formErrorHandlingRef"
                @submit.prevent=""
              >
                <slot name="error-handling-fields" />
              </v-form>
            </template>
          </AppTabs>
        </div>
      </template>
      <template v-if="$slots.default">
        <v-form
          ref="formMainRef"
          @submit.prevent=""
        >
          <slot />
        </v-form>
      </template>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.wrapper {
  .v-card-text {
    // Workflow edit page floating component: 100dvh - app header - top offset - card title - bottom offset
    height: calc(100dvh - 60px - 20px - 60px - 60px);
    overflow-y: auto;
  }
  &:not(.full-width) {
    max-width: calc(100% - 32px * 2);
    position: absolute;
    right: 32px;
    top: calc(60px + 20px); // header + offset
    transition: width 0.25s;
    width: v-bind('`${formWidth}px`');
    z-index: 1;
    .show-definition {
      :deep(.cm-editor) {
        // Workflow edit page floating component: 100dvh - app header - top offset - card title  - bottom offset
        height: calc(100dvh - 60px - 20px - 60px - 60px - 24px - 20px - 20px);
        max-height: none;
      }
    }
  }
}
</style>

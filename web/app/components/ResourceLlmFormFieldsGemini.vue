<script setup>
import { LlmConstant } from '~/constants';
import { GeminiLlm } from '~/models/server/llm';

/**
 * @type {{ resource: GeminiLlm }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  inputLayout: {
    type: String,
    default: 'default',
  },
  enableStateInputSwitch: {
    type: Boolean,
    default: false,
  },
});

const apiKey = defineModel('apiKey', {
  type: String,
  default: null,
});

const includeThinking = defineModel('includeThinking', {
  type: [String, Boolean],
  default: null,
});

const maxTokens = defineModel('maxTokens', {
  type: [String, Number],
  default: null,
});

const model = defineModel('model', {
  type: String,
  default: null,
});

const temperature = defineModel('temperature', {
  type: [String, Number],
  default: null,
});

const thinkingBudgetTokens = defineModel('thinkingBudgetTokens', {
  type: [String, Number],
  default: null,
});

const thinkingLevel = defineModel('thinkingLevel', {
  type: String,
  default: null,
});

const topK = defineModel('topK', {
  type: [String, Number],
  default: null,
});

const topP = defineModel('topP', {
  type: [String, Number],
  default: null,
});

const thinkingBudgetTokensRef = ref(null);

const state = reactive({
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
  enableTopK: topK.value !== null,
  budgetMode: null,
});

const maxTokensParam = computed(() => findField(LlmConstant.GeminiModel, model.value, 'maxTokens'));
const temperatureParam = computed(() => findField(LlmConstant.GeminiModel, model.value, 'temperature'));
const topPParam = computed(() => findField(LlmConstant.GeminiModel, model.value, 'topP'));
const topKParam = computed(() => findField(LlmConstant.GeminiModel, model.value, 'topK'));
const thinkingConfig = computed(() => findField(LlmConstant.Model, model.value, 'thinking'));
const supportThinking = computed(() => thinkingConfig.value?.supported);
const useBudgetTokens = computed(() => thinkingConfig.value?.useBudgetTokens);
const useThinkingLevel = computed(() => thinkingConfig.value?.useThinkingLevel);
const canDisableThinking = computed(() => thinkingConfig.value?.canDisable);
const thinkingBudgetTokensParam = computed(() => thinkingConfig.value?.budgetTokens);

const modeToBudgetTokensMap = computed(() => ({
  [LlmConstant.ThinkingBudgetMode.DYNAMIC.value]: thinkingBudgetTokensParam.value?.fixedForDynamic,
  [LlmConstant.ThinkingBudgetMode.DISABLED.value]: thinkingBudgetTokensParam.value?.fixedForDisabled,
  [LlmConstant.ThinkingBudgetMode.CUSTOM.value]: thinkingBudgetTokensParam.value?.default,
}));

const getModeFromBudgetTokens = (tokens) => {
  return Object.entries(modeToBudgetTokensMap.value)
    .find(([, value]) => value === tokens)?.[0]
    ?? LlmConstant.ThinkingBudgetMode.CUSTOM.value;
};

const handleModelChange = async () => {
  state.enableMaxTokens = false;
  maxTokens.value = null;
  thinkingBudgetTokens.value = null;
  thinkingLevel.value = null;
  includeThinking.value = false;
  state.budgetMode = null;
  await nextTick();
  if (!supportThinking.value) return;
  if (useBudgetTokens.value) {
    state.budgetMode = LlmConstant.ThinkingBudgetMode.DYNAMIC.value;
    thinkingBudgetTokens.value = thinkingBudgetTokensParam.value.fixedForDynamic;
  }
  if (useThinkingLevel.value) {
    thinkingLevel.value = LlmConstant.ThinkingLevel.HIGH.value;
  }
};

const handleBudgetModeChange = (mode) => {
  thinkingBudgetTokens.value = modeToBudgetTokensMap.value[mode];
  if (mode === LlmConstant.ThinkingBudgetMode.DISABLED.value) {
    includeThinking.value = false;
  }
};

const initializeState = () => {
  if (!supportThinking.value) return;
  state.budgetMode = getModeFromBudgetTokens(thinkingBudgetTokens.value);
};

initializeState();

const defaultParams = props.resource || new GeminiLlm();
</script>

<template>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('apiKey')"
    v-model="apiKey"
    :default-value="defaultParams.apiKey"
    :label="$t('__fieldApiKey')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <AppSecretInput
        :id="id"
        v-model="apiKey"
        :is-reset-button-visible="!!props.resource"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </template>
  </StateInputGroup>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('model')"
    v-model="model"
    :default-value="defaultParams.model"
    :label="$t('__fieldModel')"
    :tooltip="$t('__tooltipResourceLlmModel')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <!-- Check if the model is available  -->
    <template #default="{ id, label }">
      <AppSelect
        :id="id"
        v-model="model"
        :items="Object.values(LlmConstant.GeminiModel)"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(Object.values(LlmConstant.GeminiModel).map((m) => m.value))
            .collect()
        )"
        @update:model-value="handleModelChange"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <template v-if="supportThinking">
        <template v-if="useBudgetTokens">
          <StateInputGroup
            v-if="!props.hiddenFields.includes('thinkingBudgetTokens')"
            v-model="thinkingBudgetTokens"
            :default-value="defaultParams.thinkingBudgetTokens"
            :label="$t('__fieldThinkingBudgetTokens')"
            :tooltip="$t('__tooltipResourceThinkingBudgetTokens')"
            :enable-switch="props.enableStateInputSwitch"
          >
            <template #default="{ id, label }">
              <AppSelect
                v-model="state.budgetMode"
                :items="Object.values(LlmConstant.ThinkingBudgetMode)
                  .map(item => ({
                    ...item,
                    title: $t(item.i18nTitle),
                    subtitle: $t(item.i18nSubtitle),
                    disabled: item.value === LlmConstant.ThinkingBudgetMode.DISABLED.value && !canDisableThinking,
                  }))"
                @update:model-value="handleBudgetModeChange"
              />
              <template v-if="state.budgetMode === LlmConstant.ThinkingBudgetMode.CUSTOM.value">
                <AppSlider
                  :id="id"
                  ref="thinkingBudgetTokensRef"
                  v-model="thinkingBudgetTokens"
                  :min="thinkingBudgetTokensParam?.min"
                  :max="thinkingBudgetTokensParam?.max"
                  :step="thinkingBudgetTokensParam?.step"
                  :layout="props.inputLayout"
                  :rules="(
                    $validator
                      .defineField(label)
                      .when({
                        gte: maxTokens && !jsonPathUtils.isJsonPath(maxTokens),
                        lt: maxTokens && !jsonPathUtils.isJsonPath(maxTokens),
                      })
                      .gte(thinkingBudgetTokensParam?.min)
                      .lte(thinkingBudgetTokensParam?.max)
                      .lt(maxTokens)
                      .integer()
                      .collect()
                  )"
                />
              </template>
            </template>
          </StateInputGroup>
        </template>
        <template v-else-if="useThinkingLevel">
          <StateInputGroup
            v-if="!props.hiddenFields.includes('thinkingLevel')"
            v-model="thinkingLevel"
            :default-value="LlmConstant.ThinkingLevel.HIGH.value"
            :label="$t('__fieldThinkingLevel')"
            :tooltip="$t('__tooltipResourceThinkingLevel')"
            :enable-switch="props.enableStateInputSwitch"
            required
          >
            <template #default="{ id, label }">
              <AppSelect
                :id="id"
                v-model="thinkingLevel"
                :items="Object.values(LlmConstant.ThinkingLevel).map(item => ({
                  ...item,
                  title: $t(item.i18nTitle),
                  subtitle: $t(item.i18nSubtitle),
                }))"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </template>
          </StateInputGroup>
        </template>
        <StateInputGroup
          v-if="!props.hiddenFields.includes('includeThinking') && thinkingBudgetTokens !== thinkingBudgetTokensParam?.fixedForDisabled"
          v-model="includeThinking"
          class="mb-4"
          :label="$t('__fieldIncludeThinking')"
          :tooltip="$t('__tooltipResourceIncludeThinking')"
          :enable-switch="props.enableStateInputSwitch"
        >
          <template #default="{ id }">
            <AppSwitch
              :id="id"
              v-model="includeThinking"
              hide-details
            />
          </template>
        </StateInputGroup>
      </template>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('maxTokens')"
        v-model="maxTokens"
        :default-value="defaultParams.maxTokens"
        :label="$t('__fieldMaxTokens')"
        :tooltip="$t('__tooltipResourceMaxTokens')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enableMaxTokens = v !== null;
          }
        }"
      >
        <template #default="{ id, label }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableMaxTokens"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                if (!v) {
                  maxTokens = null;
                  return;
                }
                maxTokens = supportThinking ? maxTokensParam?.defaultForThinking : (defaultParams.maxTokens || maxTokensParam?.default);
              }"
            />
            <AppSlider
              v-model="maxTokens"
              :aria-label="label"
              :disabled="!state.enableMaxTokens"
              :min="thinkingBudgetTokens ? thinkingBudgetTokens + 1 : maxTokensParam?.min"
              :max="maxTokensParam?.max"
              :step="maxTokensParam?.step"
              :layout="props.inputLayout"
              @update:model-value="() => {
                if (state.budgetMode === LlmConstant.ThinkingBudgetMode.CUSTOM.value) {
                  thinkingBudgetTokensRef.validate();
                }
              }"
            />
            <AppTooltip
              v-if="!model"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceSelectModelFirst')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('temperature')"
        v-model="temperature"
        :default-value="defaultParams.temperature"
        :label="$t('__fieldTemperature')"
        :tooltip="$t('__tooltipResourceTemperature')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enableTemperature = v !== null;
          }
        }"
      >
        <template #default="{ id }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableTemperature"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                temperature = v ? (defaultParams.temperature || temperatureParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="temperature"
              :disabled="!state.enableTemperature"
              :min="temperatureParam?.min"
              :max="temperatureParam?.max"
              :step="temperatureParam?.step"
              :layout="props.inputLayout"
            />
            <AppTooltip
              v-if="!model"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceSelectModelFirst')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('topP')"
        v-model="topP"
        :default-value="defaultParams.topP"
        :label="$t('__fieldTopP')"
        :tooltip="$t('__tooltipResourceTopP')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enableTopP = v !== null;
          }
        }"
      >
        <template #default="{ id }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableTopP"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                topP = v ? (defaultParams.topP || topPParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="topP"
              :disabled="!state.enableTopP"
              :min="topPParam?.min"
              :max="topPParam?.max"
              :step="topPParam?.step"
              :layout="props.inputLayout"
            />
            <AppTooltip
              v-if="!model"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceSelectModelFirst')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('topK')"
        v-model="topK"
        :default-value="defaultParams.topK"
        :label="$t('__fieldTopK')"
        :tooltip="$t('__tooltipResourceTopK')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enableTopK = v !== null;
          }
        }"
      >
        <template #default="{ id }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableTopK"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                topK = v ? (defaultParams.topK || topKParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="topK"
              :disabled="!state.enableTopK"
              :min="topKParam?.min"
              :max="topKParam?.max"
              :step="topKParam?.step"
              :layout="props.inputLayout"
            />
            <AppTooltip
              v-if="!model"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceSelectModelFirst')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

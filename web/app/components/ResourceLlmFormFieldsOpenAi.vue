<script setup>
import { LlmConstant } from '~/constants';
import { OpenAiLlm } from '~/models/server/llm';

/**
 * @type {{ resource: OpenAiLlm }}
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

const model = defineModel('model', {
  type: String,
  default: null,
});

const maxTokens = defineModel('maxTokens', {
  type: [String, Number],
  default: null,
});

const temperature = defineModel('temperature', {
  type: [String, Number],
  default: null,
});

const topP = defineModel('topP', {
  type: [String, Number],
  default: null,
});

const includeThinking = defineModel('includeThinking', {
  type: [String, Boolean],
  default: false,
});

const thinkingEffort = defineModel('thinkingEffort', {
  type: String,
  default: null,
});

const state = reactive({
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
});

const maxTokensParam = computed(() => findField(LlmConstant.OpenAiModel, model.value, 'maxTokens'));
const temperatureParam = computed(() => findField(LlmConstant.OpenAiModel, model.value, 'temperature'));
const topPParam = computed(() => findField(LlmConstant.OpenAiModel, model.value, 'topP'));
const thinkingConfig = computed(() => findField(LlmConstant.Model, model.value, 'thinking'));
const supportThinking = computed(() => thinkingConfig.value?.supported);
const canDisableThinking = computed(() => thinkingConfig.value?.canDisable);
const supportedThinkingEfforts = computed(() => thinkingConfig.value?.supportedEfforts || []);
const defaultThinkingEffort = computed(() => thinkingConfig.value?.defaultEffort);

const handleModelChange = async () => {
  state.enableMaxTokens = false;
  maxTokens.value = null;
  includeThinking.value = false;
  thinkingEffort.value = null;
  await nextTick();
  if (!supportThinking.value) return;
  state.enableTemperature = true;
  state.enableTopP = true;
  temperature.value = temperatureParam.value.fixedValue;
  topP.value = topPParam.value.fixedValue;
  thinkingEffort.value = defaultThinkingEffort.value;
};

const defaultParams = props.resource || new OpenAiLlm();
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
    <template #default="{ id, label }">
      <!-- Check if the model is available  -->
      <AppSelect
        :id="id"
        v-model="model"
        :items="Object.values(LlmConstant.OpenAiModel)"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(Object.values(LlmConstant.OpenAiModel).map((m) => m.value))
            .collect()
        )"
        @update:model-value="handleModelChange"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <template v-if="supportThinking">
        <StateInputGroup
          v-if="!props.hiddenFields.includes('thinkingEffort')"
          v-model="thinkingEffort"
          :label="$t('__fieldThinkingEffort')"
          :tooltip="$t('__tooltipResourceThinkingEffort')"
          :enable-switch="props.enableStateInputSwitch"
        >
          <template #default="{ id }">
            <AppSelect
              :id="id"
              v-model="thinkingEffort"
              :items="Object.values(LlmConstant.ThinkingEffort)
                .filter(item => item.value !== LlmConstant.ThinkingEffort.MAX.value)
                .map(item => ({
                  ...item,
                  title: $t(item.i18nTitle),
                  subtitle: $t(item.i18nSubtitle),
                  disabled: item.value === LlmConstant.ThinkingEffort.NONE.value
                    ? !canDisableThinking
                    : !supportedThinkingEfforts.includes(item.value),
                }))"
              @update:model-value="(v) => {
                if (v === LlmConstant.ThinkingEffort.NONE.value) {
                  includeThinking = false;
                }
              }"
            />
          </template>
        </StateInputGroup>
        <StateInputGroup
          v-if="!props.hiddenFields.includes('includeThinking') && thinkingEffort !== LlmConstant.ThinkingEffort.NONE.value"
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
                maxTokens = v ? (defaultParams.maxTokens || maxTokensParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="maxTokens"
              :aria-label="label"
              :disabled="!state.enableMaxTokens || !model"
              :min="maxTokensParam?.min"
              :max="maxTokensParam?.max"
              :step="maxTokensParam?.step"
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
        v-if="!props.hiddenFields.includes('temperature')"
        v-model="temperature"
        :default-value="defaultParams.temperature"
        :label="$t('__fieldTemperature')"
        :tooltip="$t('__tooltipResourceTemperature')"
        :enable-switch="props.enableStateInputSwitch && !supportThinking"
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
              :disabled="!model || supportThinking"
              class="mr-2"
              @update:model-value="(v) => {
                temperature = v ? (defaultParams.temperature || temperatureParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="temperature"
              :disabled="!state.enableTemperature || supportThinking"
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
            <AppTooltip
              v-else-if="supportThinking"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTemperatureForGpt5Series')"
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
        :enable-switch="props.enableStateInputSwitch && !supportThinking"
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
              :disabled="!model || supportThinking"
              class="mr-2"
              @update:model-value="(v) => {
                topP = v ? (defaultParams.topP || topPParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="topP"
              :disabled="!state.enableTopP || supportThinking"
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
            <AppTooltip
              v-else-if="supportThinking"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTopPForGpt5Series')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

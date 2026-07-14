<script setup>
import { LlmConstant } from '~/constants';
import { BedrockAnthropicLlm } from '~/models/server/llm';

/**
 * @type {{ resource: BedrockAnthropicLlm }}
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

const { t } = useI18n();

const model = defineModel('model', {
  type: String,
  default: null,
});

const region = defineModel('region', {
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

const topK = defineModel('topK', {
  type: [String, Number],
  default: null,
});

const performanceConfigLatency = defineModel('performanceConfigLatency', {
  type: String,
  default: null,
});

const credentialType = defineModel('credentialType', {
  type: String,
  default: null,
});

const awsAccessKeyId = defineModel('awsAccessKeyId', {
  type: String,
  default: null,
});

const awsSecretAccessKey = defineModel('awsSecretAccessKey', {
  type: String,
  default: null,
});

const accountId = defineModel('accountId', {
  type: String,
  default: null,
});

const roleName = defineModel('roleName', {
  type: String,
  default: null,
});

const enableThinking = defineModel('enableThinking', {
  type: [String, Boolean],
  default: false,
});

const includeThinking = defineModel('includeThinking', {
  type: [String, Boolean],
  default: false,
});

const thinkingBudgetTokens = defineModel('thinkingBudgetTokens', {
  type: [String, Number],
  default: null,
});

const effort = defineModel('effort', {
  type: String,
  default: null,
});

if (awsAccessKeyId.value) {
  credentialType.value = LlmConstant.CredentialType.ACCESS_KEY.value;
}

if (accountId.value && roleName.value) {
  credentialType.value = LlmConstant.CredentialType.IAM_ROLE.value;
}

const thinkingBudgetTokensRef = ref(null);

const state = reactive({
  modelItems: Object.values(LlmConstant.BedrockAnthropicModel),
  regionItems: [],
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
  enableTopK: topK.value !== null,
});

const initializeState = () => {
  state.regionItems = findField(state.modelItems, model.value, 'supportedRegions') || [];
};

initializeState();

const getModelParam = (modelName, fieldName) => findField(LlmConstant.BedrockAnthropicModel, modelName, fieldName);

const maxTokensParam = computed(() => getModelParam(model.value, 'maxTokens'));
const temperatureParam = computed(() => getModelParam(model.value, 'temperature'));
const topPParam = computed(() => getModelParam(model.value, 'topP'));
const topKParam = computed(() => getModelParam(model.value, 'topK'));
const thinkingConfig = computed(() => getModelParam(model.value, 'thinking'));
const thinkingBudgetTokensParam = computed(() => thinkingConfig.value?.budgetTokens);
const supportsThinking = computed(() => thinkingConfig.value?.supported);
const supportedThinkingEfforts = computed(() => thinkingConfig.value?.supportedEfforts || []);
const usesThinkingEffort = computed(() => supportedThinkingEfforts.value.length > 0);
const supportsTemperature = computed(() => !model.value || !!temperatureParam.value);
const supportsTopP = computed(() => !model.value || !!topPParam.value);
const supportsTopK = computed(() => !model.value || !!topKParam.value);

const filteredPerformanceConfigLatencyOptions = computed(() => {
  const selectedModel = LlmConstant.BedrockLatencyConfigSupportedModels.find(item => item.value === model.value);
  const isOptimizedRegionSupported = selectedModel?.latencyOptimizedRegions?.some(item => item.value === region.value);
  return Object.values(LlmConstant.BedrockPerformanceConfigLatencyOption).map(item => ({
    ...item,
    title: t(item.i18nTitle),
    subtitle: t(item.i18nSubtitle),
    disabled: item.value === LlmConstant.BedrockPerformanceConfigLatencyOption.OPTIMIZED.value && !isOptimizedRegionSupported,
  }));
});

const isMutuallyExclusiveTemperatureAndTopPModel = computed(() => LlmConstant.BedrockMutuallyExclusiveTemperatureAndTopPModels.some(m => m.value === model.value));

const handleModelChange = async (v) => {
  const selectedThinkingConfig = getModelParam(v, 'thinking');
  const usesEffort = selectedThinkingConfig?.supportedEfforts?.length > 0;

  state.regionItems = getModelParam(v, 'supportedRegions') || [];
  region.value = null;
  performanceConfigLatency.value = null;
  state.enableMaxTokens = false;
  maxTokens.value = null;
  enableThinking.value = usesEffort;
  includeThinking.value = false;
  thinkingBudgetTokens.value = null;
  effort.value = usesEffort ? LlmConstant.ThinkingEffort.HIGH.value : null;
  if (usesEffort) {
    state.enableTemperature = false;
    temperature.value = null;
    state.enableTopP = false;
    topP.value = null;
    state.enableTopK = false;
    topK.value = null;
    return;
  }
  await nextTick();
  if (isMutuallyExclusiveTemperatureAndTopPModel.value) {
    state.enableTemperature = false;
    state.enableTopP = false;
    temperature.value = null;
    topP.value = null;
  }
};

const handleEnableThinkingUpdate = (v) => {
  if (!v) {
    includeThinking.value = false;
    thinkingBudgetTokens.value = null;
    effort.value = null;
    return;
  }
  if (usesThinkingEffort.value) {
    effort.value = effort.value || LlmConstant.ThinkingEffort.HIGH.value;
    return;
  }
  state.enableTemperature = true;
  temperature.value = temperatureParam.value?.fixedForThinking;
  state.enableTopK = false;
  topK.value = null;
  state.enableTopP = false;
  topP.value = null;
  thinkingBudgetTokens.value = thinkingBudgetTokensParam.value?.default;
  if (maxTokens.value && !jsonPathUtils.isJsonPath(maxTokens.value)) {
    maxTokens.value = maxTokensParam.value?.defaultForThinking;
  }
};

const handleCredentialTypeChange = () => {
  awsAccessKeyId.value = null;
  awsSecretAccessKey.value = null;
  accountId.value = null;
  roleName.value = null;
};

const defaultParams = props.resource || new BedrockAnthropicLlm();
</script>

<template>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('model')"
    v-model="model"
    :default-value="defaultParams.model"
    :label="$t('__fieldModel')"
    :tooltip="$t('__tooltipResourceLlmBedrockModel')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <!-- Check if the model is available  -->
      <AppSelect
        :id="id"
        v-model="model"
        :items="state.modelItems"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(state.modelItems.map((m) => m.value))
            .collect()
        )"
        @update:model-value="handleModelChange"
      />
    </template>
  </StateInputGroup>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('region')"
    v-model="region"
    :default-value="defaultParams.region"
    :label="$t('__fieldRegion')"
    :tooltip="$t('__tooltipResourceLlmAwsBedrockRegion')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <AppAutocomplete
        :id="id"
        v-model="region"
        :items="state.regionItems"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        @update:model-value="() => {
          performanceConfigLatency = null;
        }"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('credentialType')"
        v-slot="{ id }"
        :label="$t('__fieldCredentialType')"
      >
        <AppSelect
          :id="id"
          v-model="credentialType"
          :items="Object.values(LlmConstant.CredentialType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          clearable
          @update:model-value="handleCredentialTypeChange"
        />
      </AppInputGroup>
      <template v-if="credentialType === LlmConstant.CredentialType.ACCESS_KEY.value">
        <AppInputGroup
          v-if="!props.hiddenFields.includes('awsAccessKeyId')"
          v-slot="{ id, label }"
          :label="$t('__fieldAwsAccessKeyId')"
          required
        >
          <AppTextField
            :id="id"
            v-model="awsAccessKeyId"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
        <AppInputGroup
          v-if="!props.hiddenFields.includes('awsSecretAccessKey')"
          v-slot="{ id, label }"
          :label="$t('__fieldAwsSecretAccessKey')"
          required
        >
          <AppSecretInput
            :id="id"
            v-model="awsSecretAccessKey"
            :is-reset-button-visible="!!props.resource?.awsAccessKeyId"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <template v-else-if="credentialType === LlmConstant.CredentialType.IAM_ROLE.value">
        <AppInputGroup
          v-if="!props.hiddenFields.includes('accountId')"
          v-slot="{ id, label }"
          :label="$t('__fieldAccountId')"
          required
        >
          <AppTextField
            :id="id"
            v-model="accountId"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .numeric()
                .stringLength(12)
                .collect()
            )"
          />
        </AppInputGroup>
        <AppInputGroup
          v-if="!props.hiddenFields.includes('roleName')"
          v-slot="{ id, label }"
          :label="$t('__fieldRoleName')"
          required
        >
          <AppTextField
            :id="id"
            v-model="roleName"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <StateInputGroup
        v-if="supportsThinking && !props.hiddenFields.includes('enableThinking')"
        v-model="enableThinking"
        class="mb-4"
        :label="$t('__fieldEnableThinking')"
        :tooltip="$t('__tooltipResourceEnableThinking')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSwitch
            :id="id"
            v-model="enableThinking"
            hide-details
            @update:model-value="handleEnableThinkingUpdate"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="enableThinking && usesThinkingEffort && !props.hiddenFields.includes('effort')"
        v-model="effort"
        :label="$t('__fieldThinkingEffort')"
        :tooltip="$t('__tooltipResourceThinkingEffort')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="effort"
            :items="Object.values(LlmConstant.ThinkingEffort)
              .filter(item => supportedThinkingEfforts.includes(item.value))
              .map(item => ({
                ...item,
                title: $t(item.i18nTitle),
                subtitle: $t(item.i18nSubtitle),
              }))"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="enableThinking && !props.hiddenFields.includes('includeThinking')"
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
      <StateInputGroup
        v-if="enableThinking && thinkingBudgetTokensParam && !props.hiddenFields.includes('thinkingBudgetTokens')"
        v-model="thinkingBudgetTokens"
        :default-value="defaultParams.thinkingBudgetTokens"
        :label="$t('__fieldThinkingBudgetTokens')"
        :tooltip="$t('__tooltipResourceThinkingBudgetTokens')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id, label }">
          <div class="d-flex align-center">
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
                  .lt(thinkingBudgetTokensParam?.max)
                  .lt(maxTokens)
                  .integer()
                  .collect()
              )"
            />
          </div>
        </template>
      </StateInputGroup>
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
                maxTokens = enableThinking ? maxTokensParam?.defaultForThinking : (defaultParams.maxTokens || maxTokensParam?.default);
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
                if (enableThinking) {
                  thinkingBudgetTokensRef?.validate();
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
        v-if="supportsTemperature && !props.hiddenFields.includes('temperature')"
        v-model="temperature"
        :default-value="defaultParams.temperature"
        :label="$t('__fieldTemperature')"
        :tooltip="$t('__tooltipResourceTemperature')"
        :enable-switch="props.enableStateInputSwitch && !enableThinking"
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
              :disabled="!model || (isMutuallyExclusiveTemperatureAndTopPModel && state.enableTopP) || !!enableThinking"
              class="mr-2"
              @update:model-value="(v) => {
                temperature = v ? (defaultParams.temperature || temperatureParam?.default) : null;
                if (v && isMutuallyExclusiveTemperatureAndTopPModel && state.enableTopP) {
                  state.enableTopP = false;
                  topP = null;
                }
              }"
            />
            <AppSlider
              v-model="temperature"
              :disabled="!state.enableTemperature || !!enableThinking"
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
              v-else-if="isMutuallyExclusiveTemperatureAndTopPModel && state.enableTopP"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTemperatureDisabledDueToTopP')"
              activator="parent"
              location="bottom start"
            />
            <AppTooltip
              v-else-if="enableThinking"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTemperatureForEnableThinking')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="supportsTopP && !props.hiddenFields.includes('topP')"
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
        <template #default="{ id, label }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableTopP"
              :disabled="!model || (isMutuallyExclusiveTemperatureAndTopPModel && state.enableTemperature)"
              class="mr-2"
              @update:model-value="(v) => {
                topP = v ? (defaultParams.topP || topPParam?.default) : null;
                if (v && isMutuallyExclusiveTemperatureAndTopPModel && state.enableTemperature) {
                  state.enableTemperature = false;
                  temperature = null;
                }
              }"
            />
            <AppSlider
              v-model="topP"
              :disabled="!state.enableTopP"
              :min="enableThinking ? topPParam.minForThinking : topPParam?.min"
              :max="topPParam?.max"
              :step="enableThinking ? topPParam.stepForThinking : topPParam?.step"
              :layout="props.inputLayout"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    gte: topP && enableThinking,
                  })
                  .gte(topPParam?.minForThinking)
                  .collect()
              )"
            />
            <AppTooltip
              v-if="!model"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceSelectModelFirst')"
              activator="parent"
              location="bottom start"
            />
            <AppTooltip
              v-else-if="isMutuallyExclusiveTemperatureAndTopPModel && state.enableTemperature"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTopPDisabledDueToTemperature')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="supportsTopK && !props.hiddenFields.includes('topK')"
        v-model="topK"
        :default-value="defaultParams.topK"
        :label="$t('__fieldTopK')"
        :tooltip="$t('__tooltipResourceTopK')"
        :enable-switch="props.enableStateInputSwitch && !enableThinking"
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
              :disabled="!model || !!enableThinking"
              class="mr-2"
              @update:model-value="(v) => {
                topK = v ? (defaultParams.topK || topKParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="topK"
              :disabled="!state.enableTopK || !!enableThinking"
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
            <AppTooltip
              v-else-if="enableThinking"
              :offset="[-28, 0]"
              :text="$t('__tooltipResourceTopKForEnableThinking')"
              activator="parent"
              location="bottom start"
            />
          </div>
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('performanceConfigLatency')"
        v-model="performanceConfigLatency"
        :default-value="defaultParams.performanceConfigLatency"
        :label="$t('__fieldPerformanceConfigLatency')"
        :tooltip="$t('__tooltipResourceLlmPerformanceConfigLatency')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enablePerformanceConfigLatency = v !== null;
          }
          performanceConfigLatency = v;
        }"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="performanceConfigLatency"
            :items="filteredPerformanceConfigLatencyOptions"
            :disabled="!model || !region"
            clearable
          />
          <AppTooltip
            v-if="!model || !region"
            :offset="[-28, 0]"
            :text="$t('__tooltipResourceSelectModelAndRegionFirst')"
            activator="parent"
            location="bottom start"
          />
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

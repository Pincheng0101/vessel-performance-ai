<script setup>
import { LlmConstant } from '~/constants';
import { BedrockLlamaLlm } from '~/models/server/llm';

/**
 * @type {{ resource: BedrockLlamaLlm }}
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

if (awsAccessKeyId.value) {
  credentialType.value = LlmConstant.CredentialType.ACCESS_KEY.value;
}

if (accountId.value && roleName.value) {
  credentialType.value = LlmConstant.CredentialType.IAM_ROLE.value;
}

const state = reactive({
  modelItems: Object.values(LlmConstant.BedrockLlamaModel),
  regionItems: [],
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
});

const initializeState = () => {
  state.regionItems = findField(state.modelItems, model.value, 'supportedRegions') || [];
};

initializeState();

const maxTokensParam = computed(() => findField(LlmConstant.BedrockLlamaModel, model.value, 'maxTokens'));
const temperatureParam = computed(() => findField(LlmConstant.BedrockLlamaModel, model.value, 'temperature'));
const topPParam = computed(() => findField(LlmConstant.BedrockLlamaModel, model.value, 'topP'));

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

const handleModelChange = (v) => {
  state.regionItems = findField(LlmConstant.BedrockLlamaModel, v, 'supportedRegions') || [];
  region.value = null;
  state.enableMaxTokens = false;
  maxTokens.value = null;
  performanceConfigLatency.value = null;
};

const handleCredentialTypeChange = () => {
  awsAccessKeyId.value = null;
  awsSecretAccessKey.value = null;
  accountId.value = null;
  roleName.value = null;
};

const defaultParams = props.resource || new BedrockLlamaLlm();
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
    <AppFormFieldExpansionPanel
      :title="$t('__titleAdvancedSettings')"
      class="mb-4"
    >
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
              :disabled="!state.enableMaxTokens"
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

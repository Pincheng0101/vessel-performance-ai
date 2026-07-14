<script setup>
import { LlmConstant } from '~/constants';
import { OllamaLlm } from '~/models/server/llm';

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

const { t } = useI18n();
const snackbarStore = useSnackbarStore();

const endpointUrl = defineModel('endpointUrl', {
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

const frequencyPenalty = defineModel('frequencyPenalty', {
  type: [String, Number],
  default: null,
});

const state = reactive({
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
  enableFrequencyPenalty: frequencyPenalty.value !== null,
  modelNames: [],
  isModelsLoading: false,
  maxModelTokens: null,
});

const fetchModels = async (url) => {
  if (!url) return [];
  try {
    const data = await $fetch(`${url}/api/tags`, {
      timeout: 5000,
    });
    return data.models;
  } catch {
    snackbarStore.setFailure(t('__messageRequestError'));
    return [];
  }
};

const fetchModelInfo = async (url, modelName) => {
  if (!url || !modelName) return null;
  try {
    const data = await $fetch(`${url}/api/show`, {
      method: 'POST',
      body: {
        model: modelName,
      },
      timeout: 5000,
    });
    return data;
  } catch {
    snackbarStore.setFailure(t('__messageRequestError'));
    return null;
  }
};

const handleModelsRefresh = async ({ resetModel = true } = {}) => {
  if (!endpointUrl.value) return;
  state.isModelsLoading = true;
  if (resetModel) {
    model.value = null;
  }
  const models = await fetchModels(endpointUrl.value);
  state.modelNames = models.map(model => model.name);
  state.isModelsLoading = false;
};

const handleModelChange = async (modelName) => {
  const modelInfo = await fetchModelInfo(endpointUrl.value, modelName);
  if (!modelInfo) {
    state.maxModelTokens = null;
    return;
  }
  const contextLength = modelInfo?.model_info?.[`${modelInfo.details.family}.context_length`];
  if (contextLength) {
    state.maxModelTokens = contextLength;
    return;
  }
  state.maxModelTokens = null;
};

const handleModelMenuUpdate = async (isOpen) => {
  if (!isOpen) return;
  if (!strUtils.isValidUrl(endpointUrl.value)) return;
  if (state.isModelsLoading || state.modelNames.length > 0) return;

  await handleModelsRefresh({ resetModel: false });
};

watch(endpointUrl, () => {
  model.value = null;
  state.modelNames = [];
  state.maxModelTokens = null;
});

if (model.value) {
  handleModelChange(model.value);
}

const defaultParams = props.resource || new OllamaLlm();
</script>

<template>
  <StateInputGroup
    v-if="!props.hiddenFields.includes('endpointUrl')"
    v-model="endpointUrl"
    :default-value="defaultParams.endpointUrl"
    :label="$t('__fieldEndpointUrl')"
    :tooltip="$t('__tooltipResourceLlmOllamaEndpointUrl')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <AppTextField
        :id="id"
        v-model="endpointUrl"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .httpOrHttps()
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
    :tooltip="$t('__tooltipResourceLlmOllamaModel')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <!-- Check if the model is available  -->
    <template #default="{ id, label }">
      <AppSelect
        :id="id"
        v-model="model"
        :disabled="!strUtils.isValidUrl(endpointUrl)"
        :items="state.modelNames"
        :loading="state.isModelsLoading"
        :on-refresh="handleModelsRefresh"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(state.modelNames)
            .collect()
        )"
        @update:menu="handleModelMenuUpdate"
        @update:model-value="handleModelChange"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
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
                maxTokens = v ? LlmConstant.DefaultParams.MAX_TOKENS.default : defaultParams.maxTokens;
              }"
            />
            <AppSlider
              v-model="maxTokens"
              :aria-label="label"
              :disabled="!state.enableMaxTokens"
              :min="LlmConstant.DefaultParams.MAX_TOKENS.min"
              :max="state.maxModelTokens || LlmConstant.DefaultParams.MAX_TOKENS.max"
              :step="LlmConstant.DefaultParams.MAX_TOKENS.step"
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
                temperature = v ? LlmConstant.DefaultParams.TEMPERATURE.default : defaultParams.temperature;
              }"
            />
            <AppSlider
              v-model="temperature"
              :disabled="!state.enableTemperature"
              :min="LlmConstant.DefaultParams.TEMPERATURE.min"
              :max="LlmConstant.DefaultParams.TEMPERATURE.max"
              :step="LlmConstant.DefaultParams.TEMPERATURE.step"
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
                topP = v ? LlmConstant.DefaultParams.TOP_P.default : defaultParams.topP;
              }"
            />
            <AppSlider
              v-model="topP"
              :disabled="!state.enableTopP"
              :min="LlmConstant.DefaultParams.TOP_P.min"
              :max="LlmConstant.DefaultParams.TOP_P.max"
              :step="LlmConstant.DefaultParams.TOP_P.step"
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
        v-if="!props.hiddenFields.includes('frequencyPenalty')"
        v-model="frequencyPenalty"
        :default-value="defaultParams.frequencyPenalty"
        :label="$t('__fieldFrequencyPenalty')"
        :tooltip="$t('__tooltipResourceFrequencyPenalty')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enableFrequencyPenalty = v !== null;
          }
        }"
      >
        <template #default="{ id }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enableFrequencyPenalty"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                frequencyPenalty = v ? LlmConstant.DefaultParams.FREQUENCY_PENALTY.default : defaultParams.frequencyPenalty;
              }"
            />
            <AppSlider
              v-model="frequencyPenalty"
              :disabled="!state.enableFrequencyPenalty"
              :min="LlmConstant.DefaultParams.FREQUENCY_PENALTY.min"
              :max="LlmConstant.DefaultParams.FREQUENCY_PENALTY.max"
              :step="LlmConstant.DefaultParams.FREQUENCY_PENALTY.step"
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

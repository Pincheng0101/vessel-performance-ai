<script setup>
import { SearchEngineConstant } from '~/constants';
import { PerplexitySearchEngine } from '~/models/server/searchEngine';

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

const frequencyPenalty = defineModel('frequencyPenalty', {
  type: [String, Number],
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

const presencePenalty = defineModel('presencePenalty', {
  type: [String, Number],
  default: null,
});

const returnImages = defineModel('returnImages', {
  type: [String, Boolean],
  default: false,
});

const returnRelatedQuestions = defineModel('returnRelatedQuestions', {
  type: [String, Boolean],
  default: false,
});

const searchDomainFilter = defineModel('searchDomainFilter', {
  type: [String, Array],
  default: () => [],
});

const searchRecencyFilter = defineModel('searchRecencyFilter', {
  type: String,
  default: null,
});

const systemPrompt = defineModel('systemPrompt', {
  type: String,
  default: null,
});

const temperature = defineModel('temperature', {
  type: [String, Number],
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

const webSearchOptions = defineModel('webSearchOptions', {
  type: [String, Object],
  default: {},
});

const state = reactive({
  enableMaxTokens: maxTokens.value !== null,
  enableTemperature: temperature.value !== null,
  enableTopP: topP.value !== null,
  enableTopK: topK.value !== null,
  enablePresencePenalty: presencePenalty.value !== null,
  enableFrequencyPenalty: frequencyPenalty.value !== null,
  isPromptRewriting: false,
});

const maxTokensParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'maxTokens'));
const temperatureParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'temperature'));
const topPParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'topP'));
const topKParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'topK'));
const frequencyPenaltyParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'frequencyPenalty'));
const presencePenaltyParam = computed(() => findField(SearchEngineConstant.PerplexityModel, model.value, 'presencePenalty'));

const handleModelChange = () => {
  state.enableMaxTokens = false;
  maxTokens.value = null;
};

const defaultParams = props.resource || new PerplexitySearchEngine();
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
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <!-- Check if the model is available  -->
      <AppSelect
        :id="id"
        v-model="model"
        :items="Object.values(SearchEngineConstant.PerplexityModel)"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(Object.values(SearchEngineConstant.PerplexityModel).map((m) => m.value))
            .collect()
        )"
        @update:model-value="handleModelChange"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <StateInputGroup
        v-if="!props.hiddenFields.includes('systemPrompt')"
        v-model="systemPrompt"
        :label="$t('__fieldSystemPrompt')"
        :tooltip="$t('__tooltipResourceSystemPrompt')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppJinjaEditor
            :id="id"
            v-model="systemPrompt"
            :loading="state.isPromptRewriting"
            :disabled="state.isPromptRewriting"
            :max-lines="10"
          >
            <template #prepend-tools>
              <PromptRewriteButton
                v-model:prompt="systemPrompt"
                v-model:loading="state.isPromptRewriting"
              />
            </template>
          </AppJinjaEditor>
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
      <StateInputGroup
        v-if="!props.hiddenFields.includes('presencePenalty')"
        v-model="presencePenalty"
        :default-value="defaultParams.presencePenalty"
        :label="$t('__fieldPresencePenalty')"
        :tooltip="$t('__tooltipResourcePresencePenalty')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!jsonPathUtils.isJsonPath(v)) {
            state.enablePresencePenalty = v !== null;
          }
        }"
      >
        <template #default="{ id }">
          <div class="d-flex align-center">
            <AppCheckbox
              :id="id"
              v-model="state.enablePresencePenalty"
              :disabled="!model"
              class="mr-2"
              @update:model-value="(v) => {
                presencePenalty = v ? (defaultParams.presencePenalty || presencePenaltyParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="presencePenalty"
              :disabled="!state.enablePresencePenalty"
              :min="presencePenaltyParam?.min"
              :max="presencePenaltyParam?.max"
              :step="presencePenaltyParam?.step"
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
                frequencyPenalty = v ? (defaultParams.frequencyPenalty || frequencyPenaltyParam?.default) : null;
              }"
            />
            <AppSlider
              v-model="frequencyPenalty"
              :disabled="!state.enableFrequencyPenalty"
              :min="frequencyPenaltyParam?.min"
              :max="frequencyPenaltyParam?.max"
              :step="frequencyPenaltyParam?.step"
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
        v-if="!props.hiddenFields.includes('searchDomainFilter')"
        v-model="searchDomainFilter"
        :default-value="defaultParams.searchDomainFilter"
        :label="$t('__fieldSearchDomainFilter', 2)"
        :tooltip="$t('__tooltipResourceSearchEnginePerplexitySearchDomainFilter')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ label }">
          <ResourceSearchDomainFilterTable
            v-model="searchDomainFilter"
            :aria-label="label"
            :rules="(
              $validator
                .defineField(label)
                .arrayLengthLte(3)
                .collect()
            )"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('returnImages')"
        v-model="returnImages"
        :default-value="defaultParams.returnImages"
        :label="$t('__fieldReturnImages')"
        :tooltip="$t('__tooltipResourceSearchEnginePerplexityReturnImages')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSwitch
            :id="id"
            v-model="returnImages"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('returnRelatedQuestions')"
        v-model="returnRelatedQuestions"
        :default-value="defaultParams.returnRelatedQuestions"
        :label="$t('__fieldReturnRelatedQuestions')"
        :tooltip="$t('__tooltipResourceSearchEnginePerplexityReturnRelatedQuestions')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSwitch
            :id="id"
            v-model="returnRelatedQuestions"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('searchRecencyFilter')"
        v-model="searchRecencyFilter"
        :default-value="defaultParams.searchRecencyFilter"
        :label="$t('__fieldSearchRecencyFilter')"
        :tooltip="$t('__tooltipResourceSearchEnginePerplexitySearchRecencyFilter')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="searchRecencyFilter"
            :items="Object.values(SearchEngineConstant.PerplexitySearchRecencyFilter).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
            clearable
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('searchContextSize')"
        v-model="webSearchOptions.searchContextSize"
        :default-value="defaultParams.webSearchOptions.searchContextSize"
        :label="$t('__fieldSearchContextSize')"
        :tooltip="$t('__tooltipResourceSearchEngineSearchContextSize')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="webSearchOptions.searchContextSize"
            :items="Object.values(SearchEngineConstant.SearchContextSize).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
            clearable
          />
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

<script setup>
import { EmbeddingModelConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const region = defineModel('region', {
  type: String,
  default: null,
});

const model = defineModel('model', {
  type: String,
  default: null,
});

const inputType = defineModel('inputType', {
  type: String,
  default: null,
});

const maxTokens = defineModel('maxTokens', {
  type: Number,
  default: null,
});

const outputDimension = defineModel('outputDimension', {
  type: Number,
  default: null,
});

const truncate = defineModel('truncate', {
  type: String,
  default: null,
});

const embeddingType = defineModel('embeddingType', {
  type: String,
  default: null,
});

const state = reactive({
  enableMaxTokens: false,
  enableOutputDimension: false,
});

const initializeState = () => {
  state.enableMaxTokens = !!maxTokens.value;
  state.enableOutputDimension = !!outputDimension.value;
};

initializeState();

const getModelParam = (modelName, fieldName) => findField(EmbeddingModelConstant.BedrockCohereModel, modelName, fieldName);

const regionItems = computed(() => getModelParam(model.value, 'supportedRegions') || []);
const maxTokensParam = computed(() => getModelParam(model.value, 'maxTokens'));
const outputDimensionParam = computed(() => getModelParam(model.value, 'outputDimension'));

const handleModelChange = (v) => {
  region.value = getModelParam(v, 'region')?.default;
  maxTokens.value = state.enableMaxTokens ? getModelParam(v, 'maxTokens')?.default : null;
  outputDimension.value = state.enableOutputDimension ? getModelParam(v, 'outputDimension')?.default : null;
};
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('model')"
    v-slot="{ id, label }"
    :label="$t('__fieldModel')"
    required
  >
    <AppSelect
      :id="id"
      v-model="model"
      :items="Object.values(EmbeddingModelConstant.BedrockCohereModel)"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="handleModelChange"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('embeddingType')"
    v-slot="{ id, label }"
    :label="$t('__fieldEmbeddingModelBedrockCohereEmbeddingType')"
    :tooltip="$t('__tooltipResourceEmbeddingModelBedrockCohereEmbeddingType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="embeddingType"
      :disabled="!!props.resource"
      :items="Object.values(EmbeddingModelConstant.EmbeddingType).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('region')"
    v-slot="{ id, label }"
    :label="$t('__fieldRegion')"
    required
  >
    <AppAutocomplete
      :id="id"
      v-model="region"
      :items="regionItems"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('inputType')"
    v-slot="{ id, label }"
    :label="$t('__fieldInputType')"
    :tooltip="$t('__tooltipResourceEmbeddingModelBedrockCohereInputType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="inputType"
      :items="Object.values(EmbeddingModelConstant.BedrockCohereInputType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('truncate')"
    v-slot="{ id, label }"
    :label="$t('__fieldTruncate')"
    :tooltip="$t('__tooltipResourceEmbeddingModelBedrockCohereTruncate')"
    required
  >
    <AppSelect
      :id="id"
      v-model="truncate"
      :items="Object.values(EmbeddingModelConstant.BedrockCohereTruncate).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('maxTokens')"
        v-slot="{ id }"
        v-model="maxTokens"
        :label="$t('__fieldMaxTokens')"
        :tooltip="$t('__tooltipResourceMaxTokens')"
      >
        <div class="d-flex align-center">
          <AppCheckbox
            :id="id"
            v-model="state.enableMaxTokens"
            :disabled="!model"
            class="mr-2"
            @update:model-value="(v) => {
              maxTokens = v ? maxTokensParam.default : null;
            }"
          />
          <AppSlider
            v-model="maxTokens"
            :disabled="!state.enableMaxTokens"
            :min="maxTokensParam?.min"
            :max="maxTokensParam?.max"
            :step="maxTokensParam?.step"
          />
          <AppTooltip
            v-if="!model"
            :offset="[-28, 0]"
            :text="$t('__tooltipResourceSelectModelFirst')"
            activator="parent"
            location="bottom start"
          />
        </div>
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('outputDimension')"
        v-slot="{ id }"
        v-model="outputDimension"
        :label="$t('__fieldOutputDimension')"
        :tooltip="$t('__tooltipResourceEmbeddingModelBedrockCohereOutputDimension')"
      >
        <div class="d-flex align-center">
          <AppCheckbox
            :id="id"
            v-model="state.enableOutputDimension"
            :disabled="!model"
            class="mr-2"
            @update:model-value="(v) => {
              outputDimension = v ? outputDimensionParam.default : null;
            }"
          />
          <AppSelect
            v-model="outputDimension"
            :items="outputDimensionParam?.options"
            :default-value="state.enableOutputDimension ? outputDimensionParam?.default : null"
            :disabled="!state.enableOutputDimension"
          />
          <AppTooltip
            v-if="!model"
            :offset="[-28, 0]"
            :text="$t('__tooltipResourceSelectModelFirst')"
            activator="parent"
            location="bottom start"
          />
        </div>
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

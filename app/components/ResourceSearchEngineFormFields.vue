<script setup>
import { SearchEngineConstant } from '~/constants';
import { SearchEngineFactory } from '~/models/server/searchEngine';

/**
 * @import { SearchEngine } from '~/models/server/searchEngine'
 */

/**
 * @type {{ resource: SearchEngine }}
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
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<SearchEngine>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

// Sync local state when the prop changes externally
watch(formData, (after) => {
  props.onUpdate(after);
}, { deep: true });
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('searchEngineName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.searchEngineName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('searchEngineType')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.searchEngineType"
      :disabled="!!props.resource"
      :items="Object.values(SearchEngineConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData = SearchEngineFactory.create({
          searchEngineName: formData.searchEngineName,
          searchEngineType: v,
        });
      }"
    />
  </AppInputGroup>
  <template v-if="formData.searchEngineType === SearchEngineConstant.Type.DUCKDUCKGO.value">
    <ResourceSearchEngineFormFieldsDuckDuckGo
      v-model:region="formData.region"
      v-model:safesearch="formData.safesearch"
      v-model:timelimit="formData.timelimit"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :input-layout="props.inputLayout"
      :enable-state-input-switch="props.enableStateInputSwitch"
    />
  </template>
  <template v-else-if="formData.searchEngineType === SearchEngineConstant.Type.GOOGLE.value">
    <ResourceSearchEngineFormFieldsGoogle
      v-model:api-key="formData.apiKey"
      v-model:cx="formData.cx"
      v-model:exact-terms="formData.exactTerms"
      v-model:exclude-terms="formData.excludeTerms"
      v-model:gl="formData.gl"
      v-model:lr="formData.lr"
      v-model:or-terms="formData.orTerms"
      v-model:site-search="formData.siteSearch"
      v-model:site-search-filter="formData.siteSearchFilter"
      v-model:sort="formData.sort"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :input-layout="props.inputLayout"
      :enable-state-input-switch="props.enableStateInputSwitch"
    />
  </template>
  <template v-else-if="formData.searchEngineType === SearchEngineConstant.Type.PERPLEXITY.value">
    <ResourceSearchEngineFormFieldsPerplexity
      v-model:api-key="formData.apiKey"
      v-model:frequency-penalty="formData.frequencyPenalty"
      v-model:max-tokens="formData.maxTokens"
      v-model:model="formData.model"
      v-model:presence-penalty="formData.presencePenalty"
      v-model:return-images="formData.returnImages"
      v-model:return-related-questions="formData.returnRelatedQuestions"
      v-model:search-domain-filter="formData.searchDomainFilter"
      v-model:search-recency-filter="formData.searchRecencyFilter"
      v-model:system-prompt="formData.systemPrompt"
      v-model:temperature="formData.temperature"
      v-model:top-k="formData.topK"
      v-model:top-p="formData.topP"
      v-model:web-search-options="formData.webSearchOptions"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :input-layout="props.inputLayout"
      :enable-state-input-switch="props.enableStateInputSwitch"
    />
  </template>
  <template v-else-if="formData.searchEngineType === SearchEngineConstant.Type.OPENAI.value">
    <ResourceSearchEngineFormFieldsOpenAi
      v-model:api-key="formData.apiKey"
      v-model:max-tokens="formData.maxTokens"
      v-model:model="formData.model"
      v-model:system-prompt="formData.systemPrompt"
      v-model:temperature="formData.temperature"
      v-model:top-k="formData.topK"
      v-model:top-p="formData.topP"
      v-model:web-search-options="formData.webSearchOptions"
      :resource="props.resource"
      :hidden-fields="props.hiddenFields"
      :input-layout="props.inputLayout"
      :enable-state-input-switch="props.enableStateInputSwitch"
    />
  </template>
</template>

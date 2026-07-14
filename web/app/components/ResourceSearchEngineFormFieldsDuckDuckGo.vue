<script setup>
import { RegionConstant, SearchEngineConstant } from '~/constants';
import { DuckDuckGoSearchEngine } from '~/models/server/searchEngine';

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

const region = defineModel('region', {
  type: String,
  default: null,
});

const safesearch = defineModel('safesearch', {
  type: String,
  default: null,
});

const timelimit = defineModel('timelimit', {
  type: String,
  default: null,
});

const defaultParams = props.resource || new DuckDuckGoSearchEngine();
</script>

<template>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <StateInputGroup
        v-if="!props.hiddenFields.includes('region')"
        v-model="region"
        :default-value="defaultParams.region"
        :label="$t('__fieldRegion')"
        :tooltip="$t('__tooltipResourceSearchEngineDuckDuckGoRegion')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppAutocomplete
            :id="id"
            v-model="region"
            :items="Object.values(RegionConstant.DuckDuckGo)"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('safesearch')"
        v-model="safesearch"
        :default-value="defaultParams.safesearch"
        :label="$t('__fieldSafeSearch')"
        :tooltip="$t('__tooltipResourceSearchEngineDuckDuckGoSafeSearch')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="safesearch"
            :items="Object.values(SearchEngineConstant.DuckDuckGoSafeSearch).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('timelimit')"
        v-model="timelimit"
        :default-value="defaultParams.timelimit"
        :label="$t('__fieldTimeLimit')"
        :tooltip="$t('__tooltipResourceSearchEngineDuckDuckGoTimeLimit')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="timelimit"
            :items="Object.values(SearchEngineConstant.DuckDuckGoTimeLimit).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
            clearable
          />
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

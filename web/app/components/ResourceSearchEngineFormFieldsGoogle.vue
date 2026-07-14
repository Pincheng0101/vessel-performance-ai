<script setup>
import { GeolocationConstant, LanguageConstant, SearchEngineConstant } from '~/constants';
import { GoogleSearchEngine } from '~/models/server/searchEngine';

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

const cx = defineModel('cx', {
  type: String,
  default: null,
});

const exactTerms = defineModel('exactTerms', {
  type: [String, Array],
  default: null,
});

const excludeTerms = defineModel('excludeTerms', {
  type: [String, Array],
  default: null,
});

const gl = defineModel('gl', {
  type: String,
  default: null,
});

const lr = defineModel('lr', {
  type: [String, Array],
  default: null,
});

const orTerms = defineModel('orTerms', {
  type: [String, Array],
  default: null,
});

const siteSearch = defineModel('siteSearch', {
  type: String,
  default: null,
});

const siteSearchFilter = defineModel('siteSearchFilter', {
  type: String,
  default: null,
});

const sort = defineModel('sort', {
  type: String,
  default: null,
});

const defaultParams = props.resource || new GoogleSearchEngine();
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
    v-if="!props.hiddenFields.includes('cx')"
    v-model="cx"
    :default-value="defaultParams.cx"
    :label="$t('__fieldGoogleSearchEngineId')"
    :enable-switch="props.enableStateInputSwitch"
    required
  >
    <template #default="{ id, label }">
      <AppTextField
        :id="id"
        v-model="cx"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </template>
  </StateInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <StateInputGroup
        v-if="!props.hiddenFields.includes('exactTerms')"
        v-model="exactTerms"
        :default-value="defaultParams.exactTerms"
        :label="$t('__fieldExactTerm', 2)"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleExactTerm')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppCombobox
            :id="id"
            v-model="exactTerms"
            multiple
            chips
            clearable
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('excludeTerms')"
        v-model="excludeTerms"
        :default-value="defaultParams.excludeTerms"
        :label="$t('__fieldExcludeTerm', 2)"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleExcludeTerm')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppCombobox
            :id="id"
            v-model="excludeTerms"
            multiple
            chips
            clearable
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('gl')"
        v-model="gl"
        :default-value="defaultParams.gl"
        :label="$t('__fieldGeolocation')"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleGeolocation')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="gl"
            :items="Object.values(GeolocationConstant.Google)"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('lr')"
        v-model="lr"
        :default-value="defaultParams.lr"
        :label="$t('__fieldLanguageRestriction', 2)"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleRestriction')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppAutocomplete
            :id="id"
            v-model="lr"
            :items="Object.values(LanguageConstant.Google)"
            chips
            multiple
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('orTerms')"
        v-model="orTerms"
        :default-value="defaultParams.orTerms"
        :label="$t('__fieldOrTerm', 2)"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleOrTerm')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppCombobox
            :id="id"
            v-model="orTerms"
            multiple
            chips
            clearable
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('siteSearch')"
        v-model="siteSearch"
        :default-value="defaultParams.siteSearch"
        :label="$t('__fieldGoogleSiteSearch')"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleSiteSearch')"
        :enable-switch="props.enableStateInputSwitch"
        :on-update="(v) => {
          if (!v) {
            siteSearchFilter = null;
          }
        }"
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model="siteSearch"
            :rules="(
              $validator
                .defineField(label)
                .httpOrHttps()
                .url()
                .collect()
            )"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('siteSearchFilter')"
        v-model="siteSearchFilter"
        :default-value="defaultParams.siteSearchFilter"
        :label="$t('__fieldGoogleSiteSearchFilter')"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleSearchFilter')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppSelect
            :id="id"
            v-model="siteSearchFilter"
            clearable
            :disabled="!siteSearch"
            :items="Object.values(SearchEngineConstant.GoogleSiteSearchFilter).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-if="!props.hiddenFields.includes('sort')"
        v-model="sort"
        :default-value="defaultParams.sort"
        :label="$t('__fieldSortResult')"
        :tooltip="$t('__tooltipResourceSearchEngineGoogleSortResult')"
        :enable-switch="props.enableStateInputSwitch"
      >
        <template #default="{ id }">
          <AppTextField
            :id="id"
            v-model="sort"
          />
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>

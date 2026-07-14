<script setup>
import { McpServerPresetConstant } from '~/constants';

const props = defineProps({
  onSelect: {
    type: Function,
    required: true,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const state = reactive({
  query: '',
  sortBy: 'popularity',
});

const sortItems = computed(() => {
  const { $i18n } = useNuxtApp();
  return [
    { title: $i18n.t('__titleMcpServerPresetSortByPopularity'), value: 'popularity' },
    { title: $i18n.t('__fieldName'), value: 'name' },
  ];
});

const filteredPresets = computed(() => {
  const { $i18n } = useNuxtApp();
  let result = [...McpServerPresetConstant.Preset];
  if (state.query) {
    const q = state.query.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) || $i18n.t(p.description).toLowerCase().includes(q),
    );
  }
  if (state.sortBy === 'popularity') {
    result.sort((a, b) => {
      if (a.popularityRank === null && b.popularityRank === null) return 0;
      if (a.popularityRank === null) return 1;
      if (b.popularityRank === null) return -1;
      return a.popularityRank - b.popularityRank;
    });
  } else {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }
  return result;
});

const handleSelect = (preset) => {
  model.value = false;
  props.onSelect(preset);
};
</script>

<template>
  <AppDialog
    v-model="model"
    :width="1000"
    :aria-label="$t('__actionBrowsePresets')"
  >
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between px-4 py-3">
          <span>{{ $t('__actionBrowsePresets') }}</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="onCancel"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <AppTextField
            v-model="state.query"
            :placeholder="$t('__actionSearch')"
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-4"
          />
          <div class="d-flex align-center ga-3 mb-3">
            <v-spacer />
            <AppSelect
              v-model="state.sortBy"
              :label="$t('__actionSortBy')"
              :items="sortItems"
              density="compact"
              hide-details
              max-width="160"
            />
          </div>
          <v-row>
            <v-col
              v-for="preset in filteredPresets"
              :key="preset.id"
              cols="12"
              sm="6"
            >
              <ResourceMcpServerPresetCard
                :preset="preset"
                :on-select="handleSelect"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </AppDialog>
</template>

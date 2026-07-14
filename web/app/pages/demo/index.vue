<script setup>
import { IconConstant } from '~/constants';

const { t } = useI18n();
const authStore = useAuthStore();

const items = [
  {
    title: 'Information Security Assistant',
    href: '/demo/information-security-assistant',
    icon: 'mdi-shield-lock-outline',
    description: 'Demonstrates an information security chatbot that answers questions based on a knowledge base restricted to ISMS and PIMS documents.',
    hidden: !authStore.parsedToken.isAdmin,
  },
  {
    title: 'VAT Q&A Assistant',
    href: 'https://platform.headquarter.ai/demo/vat/execute',
    icon: 'mdi-bank-outline',
    description: 'Demonstrates a Value-Added Tax assistant that performs multi-step reasoning across various tax laws and sources to provide accurate answers.',
    hidden: !authStore.parsedToken.isAdmin,
  },
];

const state = reactive({
  query: '',
});

const filteredItems = computed(() => {
  const query = String(state.query || '').toLowerCase();
  return items.filter(i => !i.hidden && i.title.toLowerCase().includes(query));
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex align-center">
      <v-icon
        :icon="IconConstant.Base.DEMO"
        class="mr-2"
        color="primary"
        size="small"
      />
      <span class="text-h6">
        {{ $t('__titleDemo') }}
      </span>
    </div>
    <AppTextField
      v-model="state.query"
      :label="$t('__actionSearch')"
      prepend-inner-icon="mdi-magnify"
      hide-details
      clearable
    />
    <v-row>
      <template v-if="filteredItems.length > 0">
        <v-col
          v-for="item in filteredItems"
          :key="item.title"
          :cols="12"
          :sm="6"
          :md="4"
        >
          <v-card
            :aria-label="item.title"
            :href="item.href"
            :min-height="180"
            target="_blank"
            rel="noopener noreferrer"
          >
            <v-card-item>
              <template #prepend>
                <v-icon color="primary">
                  {{ item.icon }}
                </v-icon>
              </template>
              <div class="font-weight-medium text-truncate-2 pr-8">
                {{ item.title }}
              </div>
            </v-card-item>
            <v-card-text>
              {{ item.description }}
            </v-card-text>
          </v-card>
        </v-col>
      </template>
      <template v-else>
        <v-col :cols="12">
          <AppInfoCard
            :instruction="t('__instructionNoResultsFound')"
            min-height="400"
          />
        </v-col>
      </template>
    </v-row>
  </div>
</template>

<style lang="scss" scoped>
:deep(.v-card-title) {
  background: transparent !important;
}
</style>

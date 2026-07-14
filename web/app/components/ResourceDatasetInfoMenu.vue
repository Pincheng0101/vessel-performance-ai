<script setup>
import { ResourceConstant } from '~/constants';

const state = reactive({
  isOpen: false,
});

const route = useRoute();
const { openInNewTab } = useNavigation();
</script>

<template>
  <v-menu
    v-model="state.isOpen"
    :close-on-content-click="false"
    @update:model-value="(v) => state.isOpen = v"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        variant="text"
        :icon="state.isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        :ripple="false"
      />
    </template>
    <v-card
      :elevation="1"
      :width="160"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <v-list-item
          class="text-body-2"
          prepend-icon="mdi-information-outline"
          @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, route.params.id)}`)"
        >
          {{ $t('__fieldDetail') }}
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

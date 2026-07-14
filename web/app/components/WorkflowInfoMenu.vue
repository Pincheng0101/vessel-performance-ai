<script setup>
/**
 * @import { Workflow } from '~/models/server/workflow'
 */

/**
 * @type {{ workflow: Workflow }}
 */
const props = defineProps({
  workflow: {
    type: Object,
    default: () => {},
  },
});

const state = reactive({
  isOpen: false,
});
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
        <WorkflowDetailsDialog
          :workflow="props.workflow"
          :on-close="() => { state.isOpen = false; }"
        >
          <template #activator="{ onOpen, isLoading }">
            <v-list-item
              class="text-body-2"
              prepend-icon="mdi-information-outline"
              @click="onOpen"
            >
              <template v-if="isLoading">
                <AppProgressCircular
                  :size="20"
                  :width="2"
                />
              </template>
              <template v-else>
                {{ $t('__fieldDetail', 2) }}
              </template>
            </v-list-item>
          </template>
        </WorkflowDetailsDialog>
      </v-list>
    </v-card>
  </v-menu>
</template>

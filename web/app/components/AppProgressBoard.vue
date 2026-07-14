<script setup>
import { StatusConstant } from '~/constants';

/**
 * @import { ProgressBoardItem } from '~/models/ui/progressBoard';
 */

/**
 * @type {{ items: ProgressBoardItem[] }}
 */
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  onRerun: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <v-list>
    <template
      v-for="(item, i) in props.items"
      :key="i"
    >
      <v-list-item class="pa-0">
        <v-card
          :class="{
            'bg-backgroundScale1': item.isProcessing || item.isFailed,
          }"
          variant="text"
        >
          <v-card-text class="d-flex justify-start align-start ga-2">
            <div>
              <template v-if="item.isNotStarted">
                <v-icon
                  icon="mdi-circle-outline"
                  class="mr-1"
                  :size="16"
                  color="white"
                />
              </template>
              <template v-else-if="item.isProcessing">
                <AppProgressDots
                  :dot-count="1"
                  class="mt-1"
                />
              </template>
              <template v-else>
                <v-icon
                  :icon="findField(StatusConstant.Runtime, item.status, 'icon')"
                  class="mr-1"
                  :size="16"
                  :color="item.status.toLowerCase()"
                />
              </template>
            </div>
            <div>
              <p class="text-body-2">
                {{ item.title }}
              </p>
              <template v-if="item.isProcessing">
                <p class="text-caption text-backgroundScale4">
                  {{ item.subtitle }}
                </p>
              </template>
              <template v-else-if="item.isFailed">
                <p class="text-caption text-backgroundScale4">
                  {{ item.errorMessage }}
                </p>
              </template>
            </div>
            <AppIconButton
              v-if="item.isFailed && item.onRun"
              icon="mdi-refresh"
              :tooltip="$t('__actionRerun')"
              variant="tonal"
              @click="() => props.onRerun(item)"
            />
          </v-card-text>
        </v-card>
      </v-list-item>
    </template>
  </v-list>
</template>

<style lang="scss" scoped>
.v-list {
  background-color: transparent !important;
}
.v-card {
  transition: background-color 0.25s;
}
</style>

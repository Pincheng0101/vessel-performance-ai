<script setup>
import { StateConstant, StatusConstant } from '~/constants';

const props = defineProps({
  executionArn: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();
const {
  fetchCompleteHistory,
  historyByFinishedState,
  isLoading,
} = useWorkflowExecutionHistory();

const state = reactive({
  selectedState: null,
});

if (props.executionArn) {
  fetchCompleteHistory({
    executionArn: props.executionArn,
  });
}

watch(historyByFinishedState, (after) => {
  if (after.length > 0 && !state.selectedState) {
    state.selectedState = after[0];
  }
});

const getStateIcon = (state) => {
  const type = state.type;
  const actionType = objUtils.getFirstValueByKey(state.output, 'action_type') || objUtils.getFirstValueByKey(state.input, 'action_type');
  return findField(StateConstant.ActionType, actionType, 'icon') || findField(StateConstant.Type, type, 'icon') || '';
};

const getStateIconColor = (state) => {
  return findField(StateConstant.Type, state.type, 'iconColor');
};

const getItemsDisplayFields = (state) => {
  return [
    {
      title: t('__fieldInput'),
      value: state.input,
      isJsonCode: true,
      editorOptions: { lines: 10 },
    },
    {
      title: t('__fieldOutput'),
      value: state.output,
      isJsonCode: true,
      isHidden: !state.output,
      editorOptions: { lines: 10 },
    },
    {
      title: t('__fieldError'),
      value: state.error,
      isHidden: !state.error,
      isChip: true,
    },
    {
      title: t('__fieldCause'),
      value: state.cause,
      isJsonCode: true,
      isHidden: !state.cause,
      editorOptions: { enableLineWrapping: true },
    },
  ];
};
</script>

<template>
  <template v-if="isLoading">
    <v-row>
      <v-col
        :cols="12"
        :sm="6"
      >
        <AppSkeletonLoader type="paragraph@3" />
      </v-col>
      <v-col
        :cols="12"
        :sm="6"
      >
        <AppSkeletonLoader type="paragraph@3" />
      </v-col>
    </v-row>
  </template>
  <template v-else>
    <v-row>
      <v-col
        :cols="12"
        :sm="6"
      >
        <v-card
          :max-height="600"
          color="backgroundScale1"
          class="overflow-y-scroll"
        >
          <v-card-text>
            <v-timeline
              align="start"
              side="end"
            >
              <v-timeline-item
                v-for="item in historyByFinishedState"
                :key="item.id"
                :dot-color="getStateIconColor(item)"
                :icon="getStateIcon(item)"
                icon-color="white"
                size="small"
                fill-dot
                @click="state.selectedState = item"
              >
                <v-list-item
                  link
                  :active="state.selectedState && state.selectedState.id === item.id"
                  class="px-2 py-4"
                  rounded="lg"
                >
                  <div class="d-flex align-center justify-space-between ga-4">
                    <p class="w-100 font-weight-medium text-truncate">
                      {{ item.name }}
                    </p>
                    <v-icon
                      class="icon"
                      :icon="findField(StatusConstant.Runtime, item.status, 'icon')"
                      :color="String(item.status).toLowerCase()"
                    />
                  </div>
                </v-list-item>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        :cols="12"
        :sm="6"
      >
        <div v-if="state.selectedState">
          <v-row>
            <v-col
              :cols="12"
              :sm="6"
            >
              <div class="d-flex align-center ga-2">
                <v-sheet
                  :color="getStateIconColor(state.selectedState)"
                  :min-height="30"
                  :min-width="30"
                  rounded="circle"
                  class="d-flex align-center justify-center pa-1"
                >
                  <v-icon
                    v-if="getStateIcon(state.selectedState)"
                    :icon="getStateIcon(state.selectedState)"
                    color="white"
                    size="small"
                  />
                </v-sheet>
                <p class="text-body-1 font-weight-bold text-truncate">
                  {{ state.selectedState.name }}
                </p>
              </div>
            </v-col>
            <v-col
              :cols="12"
              :sm="6"
            >
              <div class="d-flex align-center justify-sm-end ga-2">
                <v-chip
                  prepend-icon="mdi-timer-outline"
                  size="small"
                >
                  <AppTimeDuration
                    :milliseconds="state.selectedState.startedAfter"
                    format="HH:mm:ss.SSS"
                    class="text-truncate"
                  />
                  <AppTooltip
                    :text="$t('__fieldStartedAfter')"
                    activator="parent"
                  />
                </v-chip>
                <v-chip
                  prepend-icon="mdi-timer-sand"
                  size="small"
                >
                  <AppTimeDuration
                    :milliseconds="state.selectedState.duration"
                    display-in-seconds
                    class="text-truncate"
                  />
                  <AppTooltip
                    :text="$t('__fieldDuration')"
                    activator="parent"
                  />
                </v-chip>
              </div>
            </v-col>
          </v-row>
          <AppDisplayFieldGroup :items="getItemsDisplayFields(state.selectedState)" />
        </div>
      </v-col>
    </v-row>
  </template>
</template>

<style lang="scss" scoped>
:deep() {
  .v-timeline--vertical {
    width: 100%;
    grid-template-columns: min-content min-content minmax(0, 1fr) !important;
    row-gap: 0px !important;
    .v-timeline-divider {
      justify-content: center !important;
    }
  }
  .v-timeline-item {
    &:first-child {
      .v-timeline-item__body {
        padding-block-start: 20px !important;
      }
    }
    &:not(:first-child) {
      .v-timeline-divider__before {
        margin-top: 24px !important;
      }
    }
  }
  .v-timeline-item__body {
    width: 100%;
    padding-inline-start: 12px !important;
    padding-inline-end: 0px !important;
  }
  .v-timeline-item__opposite {
    display: none;
  }
}
</style>

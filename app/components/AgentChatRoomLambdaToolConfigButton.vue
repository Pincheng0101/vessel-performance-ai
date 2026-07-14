<script setup>
import { AgentConstant } from '~/constants';

/**
 * @import { Agent } from '~/models/server/agent'
 */

const props = defineProps({
  /** @type {Agent} */
  agent: {
    type: Object,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  hideActivator: {
    type: Boolean,
    default: false,
  },
});

/**
 * Map keyed by tool name (or the literal "lambda" for unnamed Lambda tool blocks).
 * Values are the parsed base_input objects.
 */
const lambdaBaseInputMap = defineModel('lambdaBaseInputMap', {
  type: Object,
  default: () => ({}),
});

const state = reactive({
  isOpen: false,
  workingMap: {},
});

const lambdaTools = computed(() => {
  const seen = new Set();
  return (props.agent.lambdaTools ?? [])
    .filter(tool => tool.baseInputSchema)
    .map(tool => ({
      tool,
      key: tool.name || AgentConstant.ToolType.LAMBDA.value,
      displayName: tool.displayName || tool.name || AgentConstant.ToolType.LAMBDA.value,
    }))
    .filter(({ key }) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
});

const cloneMap = () => objUtils.toRaw(lambdaBaseInputMap.value || {});

const openDialog = () => {
  state.workingMap = cloneMap();
  for (const { key } of lambdaTools.value) {
    if (state.workingMap[key] === undefined) {
      state.workingMap[key] = {};
    }
  }
  state.isOpen = true;
};

const handleSave = () => {
  lambdaBaseInputMap.value = state.workingMap;
};

const isMissingRequired = computed(() => {
  for (const { tool, key } of lambdaTools.value) {
    const required = tool.baseInputSchema?.required ?? [];
    const filled = state.workingMap[key] ?? {};
    for (const field of required) {
      if (strUtils.isEmpty(filled[field])) return true;
    }
  }
  return false;
});

const isForceMode = computed(() => !props.readonly && isMissingRequired.value);

defineExpose({ open: openDialog });
</script>

<template>
  <AppDialog
    v-if="lambdaTools.length > 0"
    v-model="state.isOpen"
    :width="800"
    :persistent="false"
    :prevent-cancel="isForceMode"
  >
    <template
      v-if="!props.hideActivator"
      #activator
    >
      <v-chip
        class="bg-background"
        color="primaryLight"
        variant="text"
        @click="openDialog"
      >
        <div class="d-flex ga-1 align-center">
          <v-icon
            icon="mdi-cog"
            size="16"
            class="mr-2"
          />
          {{ $t('__actionLambdaBaseInput') }}
        </div>
      </v-chip>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <template v-if="props.readonly">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center ga-2 pa-4">
            <v-icon
              icon="mdi-cog"
              size="20"
            />
            {{ $t('__actionLambdaBaseInput') }}
            <v-spacer />
            <AppIconButton
              icon="mdi-close"
              variant="text"
              @click="onCancel"
            />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div>
              <div
                v-for="entry in lambdaTools"
                :key="entry.key"
              >
                <div class="text-subtitle-1 mb-2">
                  {{ entry.displayName }}
                </div>
                <AppJsonSchemaRendererInput
                  v-model:form-data="state.workingMap[entry.key]"
                  :schema="entry.tool.baseInputSchema || null"
                  readonly
                  :label="entry.displayName"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </template>
      <template v-else>
        <AppForm
          :form-title="$t('__actionLambdaBaseInput')"
          icon="mdi-cog"
          :on-submit="async () => { handleSave(); await onSubmit(); }"
          :on-discard="isForceMode ? null : onCancel"
        >
          <template #body>
            <template v-if="isForceMode">
              <v-alert
                type="warning"
                variant="outlined"
                density="compact"
                class="mb-4"
                :text="$t('__messageLambdaBaseInputRequiredBeforeChat')"
              />
            </template>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('__instructionLambdaToolBaseInput') }}
            </div>
            <div>
              <div
                v-for="entry in lambdaTools"
                :key="entry.key"
              >
                <div class="text-subtitle-1 mb-2">
                  {{ entry.displayName }}
                </div>
                <AppJsonSchemaRendererInput
                  v-model:form-data="state.workingMap[entry.key]"
                  :schema="entry.tool.baseInputSchema || null"
                  :label="entry.displayName"
                />
              </div>
            </div>
          </template>
        </AppForm>
      </template>
    </template>
  </AppDialog>
</template>

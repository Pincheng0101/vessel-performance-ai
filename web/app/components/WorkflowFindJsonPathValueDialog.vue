<script setup>
import { FormConstant } from '~/constants';

const props = defineProps({
  onClose: {
    type: Function,
    default: () => {},
  },
});

const { simulatedOutputMap } = useWorkflow();

const state = reactive({
  jsonPath: '',
  value: null,
  refreshAppJsonMarkdownViewer: 0,
});

const findValue = (jsonPath) => {
  let simulatedOutputObject = {};
  for (const [, output] of simulatedOutputMap.value.entries()) {
    simulatedOutputObject = objUtils.deepMerge(simulatedOutputObject, output);
  }
  const extracted = jsonPathUtils.query(simulatedOutputObject, jsonPath);
  return extracted?.[0];
};

const isValueObject = computed(() => typeof state.value === 'object');

watch(() => isValueObject.value, () => {
  state.refreshAppJsonMarkdownViewer += 1;
});
</script>

<template>
  <AppDialog>
    <template #activator="{ onOpen }">
      <slot
        name="activator"
        :on-open="onOpen"
      />
    </template>
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <p>{{ $t('__actionFindJsonPathValue') }}</p>
          <AppIconButton
            icon="mdi-close"
            variant="text"
            :on-click="() => {
              onCancel();
              state.jsonPath = '';
              state.value = null;
              props.onClose();
            }"
          />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <p class="mb-4">
            {{ $t('__instructionFindJsonPathValue') }}
          </p>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldJsonPath')"
          >
            <StateInputCombobox
              :id="id"
              v-model="state.jsonPath"
              :label="label"
              menu-width="auto"
              @update:model-value="(v) => {
                state.value = findValue(v);
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldQueryResult')"
          >
            <AppJsonMarkdownViewer
              :id="id"
              :key="state.refreshAppJsonMarkdownViewer"
              :default-value="state.value"
              :initial-view-mode="isValueObject ? FormConstant.ViewMode.MODE_JSON : FormConstant.ViewMode.MODE_MARKDOWN"
              :max-lines="12"
              hide-details
            />
          </AppInputGroup>
          <p class="mt-4 d-flex align-start text-caption">
            <v-icon
              class="mr-1"
              icon="mdi-lightbulb-on-outline"
              color="primary"
            />
            {{ $t('__instructionCompleteSimulatedOutput') }}
          </p>
        </v-card-text>
      </v-card>
    </template>
  </AppDialog>
</template>

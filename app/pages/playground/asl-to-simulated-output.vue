<script setup>
definePageMeta({
  layout: 'fluid',
});

const { getSimulatedOutputMapFromAsl } = useWorkflow();

const state = reactive({
  asl: '',
  simulatedOutputMap: null,
});
</script>

<template>
  <ResourceInfoTitle
    title="ASL to Simulated Output"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldDefinition')">
        <template #body>
          <AppInputGroup :label="$t('__fieldDefinition')">
            <template #default="{ id }">
              <AppJsonEditor
                :id="id"
                v-model.object="state.asl"
                @update:model-value="state.simulatedOutputMap = Object.fromEntries(getSimulatedOutputMapFromAsl(jsonUtils.safeParse(state.asl)))"
              />
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldSimulatedOutput')">
        <template #body>
          <AppInputGroup :label="$t('__fieldSimulatedOutput')">
            <template #default="{ id }">
              <AppJsonEditor
                :id="id"
                v-model:object="state.simulatedOutputMap"
                readonly
              />
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

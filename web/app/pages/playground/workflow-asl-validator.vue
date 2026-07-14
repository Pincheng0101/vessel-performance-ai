<script setup>
import { workflowAslLinter } from '~/codemirror/linters';

definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  asl: '',
});
</script>

<template>
  <ResourceInfoTitle
    title="Workflow ASL Validator"
    class="mb-4"
  />
  <v-row>
    <v-col :cols="12">
      <AppForm :form-title="$t('__fieldDefinition')">
        <template #body>
          <AppInputGroup :label="$t('__fieldDefinition')">
            <template #default="{ id, label }">
              <AppJsonEditor
                :id="id"
                v-model.object="state.asl"
                :linters="[workflowAslLinter]"
                enable-lint-gutter
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .json()
                    .apply('workflowAslValidator')
                    .collect()
                )"
              />
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

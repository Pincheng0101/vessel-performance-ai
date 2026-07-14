<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  variables: {},
});
</script>

<template>
  <ResourceInfoTitle
    title="Key-Value Pair Table"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup
            :label="$t('__fieldField', 2)"
            required
          >
            <template #default>
              <AppKeyValuePairTable
                v-model:object="state.variables"
                :item-label="$t('__fieldField')"
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
      <AppForm :form-title="$t('__titleFormData')">
        <template #body>
          <AppInputGroup :label="$t('__titleFormData')">
            <template #default="{ id }">
              <AppJsonEditor
                :id="id"
                v-model:object="state.variables"
                readonly
              />
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

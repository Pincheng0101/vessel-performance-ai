<script setup>
definePageMeta({
  layout: 'fluid',
});

const test = () => {
  throw new Error('Test message for Rollbar monitoring');
};
</script>

<template>
  <ResourceInfoTitle
    title="Rollbar Tester"
    class="mb-4"
  />
  <v-row>
    <v-col :cols="12">
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppButton
            :text="$t('__actionTest')"
            @click="test"
          />
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>

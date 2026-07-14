<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const dialogRef = ref(null);

defineExpose({
  open: () => dialogRef.value.open(),
});
</script>

<template>
  <AppDialog ref="dialogRef">
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title>
          {{ $t('__titleSetSecretInputBeforeValidation') }}
        </v-card-title>
        <v-divider />
        <v-card-text class="d-flex flex-column ga-4">
          <AppDisplayField
            :item="{
              value: props.items.map(field => ({
                name: $t(field),
              })),
              table: {
                headers: [
                  { title: $t('__fieldName'), key: 'name' },
                ],
              },
            }"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <AppButton
            :text="$t('__actionOk')"
            color="primary"
            :width="100"
            @click="onCancel"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>

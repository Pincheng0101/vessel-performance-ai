<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  columnNames: {
    type: Array,
    default: () => [],
  },
  itemLabel: {
    type: String,
    default: '',
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <v-card>
    <v-card-title>{{ $t('__titleModifyItem', { action: props.actionLabel || $t('__actionDelete'), item: props.itemLabel }) }}</v-card-title>
    <v-card-text class="pt-6">
      {{ $t('__instructionDeleteMultiple', { item: props.itemLabel }) }}
      <AppDisplayFieldGroup
        :items="[
          {
            title: `${props.itemLabel} (${props.columnNames.length})`,
            value: props.columnNames.map(name => ({ name })),
            table: {
              headers: [
                { title: $t('__titleModifyItem', { action: props.itemLabel, item: $t('__fieldName') }), key: 'name' },
              ],
            },
          },
        ]"
        class="mt-3"
      />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionCancel')"
        color="actionButton"
        :width="100"
        @click="props.onCancel"
      />
      <AppButton
        :text="$t('__actionDelete')"
        color="primary"
        :loading="props.loading"
        :width="100"
        @click="props.onSubmit"
      />
    </v-card-actions>
  </v-card>
</template>

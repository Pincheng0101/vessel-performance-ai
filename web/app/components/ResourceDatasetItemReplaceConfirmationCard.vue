<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
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
    <v-card-title>{{ $t('__titleReplaceDatasetItems') }}</v-card-title>
    <v-card-text class="pt-6">
      <p class="pb-6">
        {{ $t('__instructionReplaceDatasetItems') }}
      </p>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionCancel')"
        color="actionButton"
        :width="100"
        :disabled="props.loading"
        @click="props.onCancel"
      />
      <AppButton
        :text="$t('__actionOk')"
        color="primary"
        :width="100"
        :loading="props.loading"
        @click="props.onSubmit"
      />
    </v-card-actions>
  </v-card>
</template>

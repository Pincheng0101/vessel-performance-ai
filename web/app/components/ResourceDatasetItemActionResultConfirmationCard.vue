<script setup>
const props = defineProps({
  successCount: {
    type: Number,
    default: 0,
  },
  failures: {
    type: Array,
    default: () => [],
  },
  itemLabel: {
    type: String,
    default: null,
  },
  actionLabel: {
    type: String,
    default: null,
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
    <v-card-title>{{ $t('__titleModifyItem', { action: props.actionLabel, item: $t('__fieldDatasetItem', 2) }) }}</v-card-title>
    <v-card-text class="pt-6">
      <i18n-t
        keypath="__instructionDatasetItemsActionSucceeded"
        tag="span"
      >
        <template #count>
          <span class="text-primary font-weight-bold">
            {{ props.successCount }}
          </span>
        </template>
        <template #action>
          {{ props.actionLabel }}
        </template>
      </i18n-t>
      <template v-if="props.failures?.[0].datasetItemId">
        <p class="pt-6">
          {{ $t('__subtitleActionFailed', { action: props.actionLabel }) }}
        </p>
        <AppDisplayFieldGroup
          :items="[
            {
              title: `${props.itemLabel || $t('__fieldDatasetItem', 2)} (${props.failures?.length})`,
              value: props.failures,
              table: {
                headers: [
                  { title: $t('__fieldDatasetItemId'), key: 'datasetItemId' },
                  { title: $t('__fieldErrorCause'), key: 'errorMessage' },
                ],
              },
            },
          ]"
          class="mt-3"
        />
      </template>
      <template v-else>
        <i18n-t
          keypath="__instructionDatasetItemsActionFailed"
          tag="span"
        >
          <template #count>
            <span class="text-primary font-weight-bold">
              {{ props.failures?.length }}
            </span>
          </template>
          <template #action>
            {{ props.actionLabel }}
          </template>
        </i18n-t>
      </template>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
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

<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  onClose: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <v-card>
    <v-card-title>{{ $t('__titleLoaderSyncRequired') }}</v-card-title>
    <v-card-text class="pt-6">
      <p class="pb-6">
        {{ $t('__instructionLoaderSyncRequired') }}
      </p>
      <AppInputGroup
        v-slot="{ id }"
        :label="`${$t('__fieldLoader', 2)} (${items.length})`"
      >
        <AppDisplayField
          :id="id"
          :item="{
            value: items,
            table: {
              headers: [
                { title: $t('__fieldName'), key: 'resourceName', link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, item.resourceId)}?tab=sync-jobs`, target: '_blank' }) },
              ],
            },
          }"
        />
      </AppInputGroup>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionCompletedTheSync')"
        color="actionButton"
        :width="200"
        @click="props.onClose"
      />
    </v-card-actions>
  </v-card>
</template>

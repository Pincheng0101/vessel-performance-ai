<script setup>
const props = defineProps({
  isWaiting: {
    type: Boolean,
    default: false,
  },
  onStartAuth: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});
</script>

<template>
  <AppDialog
    v-model="model"
    :on-cancel="props.onCancel"
  >
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title>{{ $t('__titleOauthAuthorization') }}</v-card-title>
        <v-divider />
        <v-card-text>
          {{ $t('__messageOauthStartAuthorization') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <AppButton
            :text="$t('__actionCancel')"
            color="actionButton"
            :width="100"
            @click="onCancel"
          />
          <AppButton
            v-if="!props.isWaiting"
            :text="$t('__actionAuthorize')"
            color="primary"
            :width="100"
            @click="props.onStartAuth"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>

<script setup>
const props = defineProps({
  actionLabel: {
    type: String,
    required: true,
  },
  instructionKeypath: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <v-card>
    <v-card-title>
      {{ strUtils.addSpacesAroundAscii(props.actionLabel) }}
    </v-card-title>
    <v-divider />
    <v-card-text>
      <i18n-t
        :keypath="props.instructionKeypath"
        tag="span"
      >
        <template #name>
          <span class="text-primary font-weight-bold">
            {{ props.name }}
          </span>
        </template>
      </i18n-t>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        :disabled="props.loading"
        color="actionButton"
        @click="props.onCancel"
      />
      <AppButton
        :text="$t('__actionOk')"
        :width="100"
        :loading="props.loading"
        color="primary"
        @click="props.onSubmit"
      />
    </v-card-actions>
  </v-card>
</template>

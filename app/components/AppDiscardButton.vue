<script setup>
const props = defineProps({
  width: {
    type: Number,
    default: 100,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <AppDialog :on-submit="props.onDiscard">
    <template #activator="{ onOpen }">
      <AppButton
        color="actionButton"
        :disabled="props.disabled"
        :text="$t('__actionDiscard')"
        :width="props.width"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <v-card>
        <v-card-title>
          {{ $t('__titleModifyItem', { action: $t('__actionDiscard'), item: $t('__fieldChange', 2) }) }}
        </v-card-title>
        <v-card-text>
          {{ $t('__instructionDiscard') }}
        </v-card-text>
        <v-card-actions class="justify-end">
          <AppButton
            :text="$t('__actionCancel')"
            :width="100"
            color="actionButton"
            @click="onCancel"
          />
          <AppButton
            :text="$t('__actionDiscard')"
            :width="100"
            color="primary"
            @click="onSubmit"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.v-card-title {
  background-color: rgba(var(--v-theme-backgroundScale)) !important;
}
</style>

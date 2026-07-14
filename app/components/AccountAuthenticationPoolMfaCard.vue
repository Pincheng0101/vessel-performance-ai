<script setup>
const props = defineProps({
  resource: {
    type: Object,
    required: true,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <AppDetailsCard
    :title="$t('__titleMfaPolicy')"
    icon="mdi-shield-check-outline"
    :display-fields="props.resource.displayFields"
  >
    <template #actions>
      <AppDialog :on-submit="props.onSubmit">
        <template #activator="{ onOpen }">
          <AppIconButton
            :aria-label="$t('__actionEdit')"
            icon="mdi-pencil"
            variant="text"
            :tooltip="$t('__actionEdit')"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AccountAuthenticationPoolMfaForm
            :resource="props.resource"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppDetailsCard>
</template>

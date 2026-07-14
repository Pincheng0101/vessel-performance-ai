<script setup>
const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const dialog = ref(null);
</script>

<template>
  <AppDialog
    ref="dialog"
    :persistent="false"
    :width="1000"
  >
    <template #activator="{ onOpen }">
      <AppIconButton
        :aria-label="$t('__titleApiEndpoint')"
        :tooltip="$t('__tooltipApiEndpoint')"
        icon="mdi-xml"
        variant="text"
        @click="onOpen"
      />
    </template>
    <template #body>
      <AppForm :form-title="$t('__titleApiEndpoint')">
        <template #actions>
          <AppIconButton
            icon="mdi-close"
            size="small"
            variant="text"
            @click="dialog.close"
          />
        </template>
        <template #body>
          <WorkflowClientCode :form-data="props.formData" />
        </template>
      </AppForm>
    </template>
  </AppDialog>
</template>

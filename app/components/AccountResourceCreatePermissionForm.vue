<script setup>
const props = defineProps({
  permissionData: {
    type: Object,
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  formData: {
    resourceType: null,
    subTypes: [],
  },
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldResourceCreationPermission') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountResourceCreatePermissionFormFields
        v-model:form-data="state.formData"
        :permission-data="props.permissionData"
      />
    </template>
  </AppForm>
</template>

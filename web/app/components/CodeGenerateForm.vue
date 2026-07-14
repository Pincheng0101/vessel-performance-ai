<script setup>
const props = defineProps({
  item: {
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
    description: '',
    inputExamples: null,
    inputSchema: null,
    runtimeType: null,
    sessionId: null,
  },
});

{
  if (props.item) {
    state.formData = { ...objUtils.toRaw(props.item) };
  }
}

const submit = async () => {
  await props.onSubmit(objUtils.toRaw(state.formData));
};

const cancel = () => {
  state.formData = props.item ? { ...objUtils.toRaw(props.item) } : {};
  props.onDiscard();
};

watch(() => props.item, (after) => {
  state.formData = after ? { ...objUtils.toRaw(after) } : {};
}, { deep: true });
</script>

<template>
  <AppForm
    :form-title="$t('__actionGenerateCode')"
    :submit-button-text="$t('__actionGenerate')"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="cancel"
  >
    <template #body>
      <CodeGenerateFormFields v-model:form-data="state.formData" />
    </template>
  </AppForm>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  llmId: {
    type: String,
    default: '',
  },
  llmType: {
    type: String,
    default: '',
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
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldContent') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ContentBlockFormFields
        v-model:form-data="state.formData"
        :llm-id="props.llmId"
        :llm-type="props.llmType"
      />
    </template>
  </AppForm>
</template>

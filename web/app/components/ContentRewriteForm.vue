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
    rewriteInstruction: '',
  },
});

if (props.item) {
  state.formData = { ...objUtils.toRaw(props.item) };
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};

const cancel = () => {
  props.onDiscard();
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleRewriteContent')"
    :submit-button-text="$t('__actionRewrite')"
    :on-submit="submit"
    :on-discard="cancel"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldPromptRewriterRewriteInstruction')"
        :tooltip="$t('__tooltipPromptRewriterInstruction')"
      >
        <AppTextarea
          :id="id"
          v-model="state.formData.rewriteInstruction"
          :rows="4"
          auto-grow
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

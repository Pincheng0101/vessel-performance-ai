<script setup>
const props = defineProps({
  rules: {
    type: Array,
    default: () => [],
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  files: [],
});

const submit = async () => {
  await props.onSubmit(state.files);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionAdd'), item: $t('__fieldFile', 2) })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldFile', 2)"
        :required="props.rules.some((rule) => rule.name === 'required')"
      >
        <AppFileInput
          :id="id"
          v-model="state.files"
          :supported-extensions="props.supportedExtensions"
          :rules="props.rules"
          multiple
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

<style lang="scss" scoped>
:deep(.v-field__input) {
  z-index: 1;
  cursor: pointer;
}
:deep(.v-file-input--chips) {
  .v-chip__content {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>

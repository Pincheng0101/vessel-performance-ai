<script setup>
const props = defineProps({
  formData: {
    type: Object,
    default: null,
  },
  fieldNames: {
    type: Array,
    default: () => [],
  },
  itemLabel: {
    type: String,
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
  formData: {},
  isLoading: false,
});

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.formData);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionDelete'), item: $t('__titleColumn', 2) })"
    :submit-button-text="$t('__actionDelete')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__titleColumn')"
        required
      >
        <AppAutocomplete
          :id="id"
          v-model="state.formData.names"
          :items="props.fieldNames"
          chips
          multiple
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

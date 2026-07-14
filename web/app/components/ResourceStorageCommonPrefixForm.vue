<script setup>
import { StorageConstant } from '~/constants';

const props = defineProps({
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
    name: '',
  },
});

const submit = async () => {
  await props.onSubmit(state.formData.name);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionNew'), item: $t('__fieldFolder') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.name"
          :disabled="state.isLoading"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .stringLengthLte(300)
              .stringNotContainsAny(StorageConstant.INVALID_SYMBOLS)
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

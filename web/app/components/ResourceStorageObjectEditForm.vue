<script setup>
import { StorageConstant } from '~/constants';

const props = defineProps({
  formData: {
    type: Object,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  progress: {
    type: Number,
    default: 0,
  },
  usedNames: {
    type: Array,
    default: () => [],
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
    name: '',
  },
  isLoading: false,
});

const usedNames = computed(() => [...props.usedNames, StorageConstant.PLACEHOLDER_OBJECT_NAME]);

if (props.formData) {
  state.formData.name = props.formData.name;
}

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.formData);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: itemLabel })"
    :on-submit="submit"
    :on-discard="props.onDiscard"
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
              .unique(usedNames, props.formData.name)
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

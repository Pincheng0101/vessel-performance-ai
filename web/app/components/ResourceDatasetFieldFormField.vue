<script setup>
/**
 * @typedef {{ name: string, description: string }} DatasetFieldFormData
 */
const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  disabledFields: {
    type: Array,
    default: () => [],
  },
  availableNames: {
    type: Array,
    default: () => [],
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({
    name: '',
    description: '',
  }),
});

if (props.item) {
  formData.value.name = props.item.name ?? '';
  formData.value.description = props.item.description ?? '';
}

const selectableNames = computed(() => {
  const currentName = formData.value.name;
  return props.availableNames.filter(name => !props.usedNames.includes(name) || name === currentName);
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    class="pb-3"
    required
  >
    <template v-if="props.availableNames.length > 0">
      <AppSelect
        :id="id"
        v-model="formData.name"
        :items="selectableNames.map(name => ({ title: name, value: name }))"
        :disabled="props.loading || props.disabledFields.includes('name') || selectableNames.length === 0"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        hide-details
      />
    </template>
    <template v-else>
      <AppTextField
        :id="id"
        v-model="formData.name"
        :disabled="props.loading || props.disabledFields.includes('name')"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .stringLengthLte(64)
            .collect()
        )"
      />
    </template>
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldDescription')"
    :tooltip="$t('__tooltipDatasetFieldDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
      :disabled="props.loading"
    />
  </AppInputGroup>
</template>

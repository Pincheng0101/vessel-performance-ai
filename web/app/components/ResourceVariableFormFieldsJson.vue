<script setup>
const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const value = defineModel('value', {
  type: [Object, String, Number],
  default: null,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('value')"
    v-slot="{ id, label }"
    :label="$t('__fieldValue')"
    required
  >
    <AppJsonEditor
      :id="id"
      v-model:object="value"
      fill-height
      :rules="(
        $validator
          .defineField(label)
          .required()
          .json()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

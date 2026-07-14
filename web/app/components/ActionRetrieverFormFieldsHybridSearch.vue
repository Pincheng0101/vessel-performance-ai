<script setup>
const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const queryStrings = defineModel('queryStrings', {
  type: [String, Object, Array],
  default: null,
});
</script>

<template>
  <StateInputGroup
    v-model="queryStrings"
    :label="$t('__fieldKeyword', 2)"
    required
    :on-update="props.onUpdate"
  >
    <template #default="{ id, label }">
      <AppCombobox
        :id="id"
        v-model="queryStrings"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .array()
            .arrayLengthGte(1)
            .collect()
        )"
        @update:model-value="props.onUpdate"
      />
    </template>
  </StateInputGroup>
</template>

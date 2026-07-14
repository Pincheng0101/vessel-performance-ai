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
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldDomain') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDomain')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.domain"
          :rules="(
            $validator
              .defineField(label)
              .domain()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

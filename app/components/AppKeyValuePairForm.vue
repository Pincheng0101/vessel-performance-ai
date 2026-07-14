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
  itemLabel: {
    type: String,
    default: '',
  },
  keyOptions: {
    type: Array,
    default: () => [],
  },
  keyFieldLabel: {
    type: String,
    default: '',
  },
  keyFieldTooltip: {
    type: String,
    default: null,
  },
  valueFieldLabel: {
    type: String,
    default: '',
  },
  valueFieldTooltip: {
    type: String,
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

const itemKeys = computed(() => new Set(props.items.map(item => item.key)));

const additionalPathOptions = computed(() => {
  return [state.formData.key, ...props.keyOptions]
    .filter(Boolean)
    .map(referencePathUtils.toDollarPrefix);
});

const submit = async () => {
  /**
   * @type {{ key: string, value: Object | String }}
   */
  const formData = objUtils.toRaw(state.formData);
  // Ensure that the key ends with '.$' if the value is a json path
  if (jsonPathUtils.isJsonPath(formData.value) && !referencePathUtils.hasDollarSuffix(formData.key)) {
    formData.key = referencePathUtils.toDollarSuffix(formData.key);
  }
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: props.itemLabel || $t('__fieldVariable') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="props.keyFieldLabel || $t('__fieldKey')"
        :tooltip="props.keyFieldTooltip"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.key"
          :items="props.keyOptions.map(referencePathUtils.toDollarSuffix).filter(v => !itemKeys.has(v))"
          :multiple="false"
          :chips="false"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.items.map(item => item.key), props.item ? props.item.key : null)
              .stringNotContainsAny(['-']) // Follow api rules to disallow dash
              .collect()
          )"
        />
      </AppInputGroup>
      <ReferencePathInputGroup
        v-model="state.formData.value"
        :label="props.valueFieldLabel || $t('__fieldValue')"
        :tooltip="props.valueFieldTooltip"
        :force-use-reference-path="referencePathUtils.hasDollarSuffix(state.formData.key) || referencePathUtils.hasPercentSuffix(state.formData.key)"
        :additional-path-options="additionalPathOptions"
        required
        persistent-switch
      >
        <template #default="{ id, label }">
          <AppJsonEditor
            :id="id"
            v-model:object="state.formData.value"
            :enable-json-linter="false"
            enable-json-path-binding-linter
            :rules="(
              $validator
                .defineField(label)
                .when({
                  jsonPathBinding: objUtils.isObject(state.formData.value),
                })
                .required()
                .apply('jsonPathBinding')
                .collect()
            )"
            allow-primitive
          />
        </template>
      </ReferencePathInputGroup>
    </template>
  </AppForm>
</template>

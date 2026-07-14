<script setup>
import { OpenSearchConstant } from '~/constants';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  urlPath: {
    type: String,
    default: '',
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

const queryParameters = computed(() => {
  switch (true) {
    case props.urlPath.includes('_search'):
      return OpenSearchConstant.SearchQueryParameters;
    case props.urlPath.includes('_doc'):
      return OpenSearchConstant.GetDocQueryParameters;
    default:
      return {};
  }
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldParameter') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldKey')"
        :tooltip="$t('__tooltipWorkflowActionOpenSearchParams')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.key"
          :items="Object.values(queryParameters)"
          :multiple="false"
          :chips="false"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.items.map(item => item.key), props.item ? props.item.key : null)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldValue')"
        required
      >
        <AppJsonEditor
          :id="id"
          v-model:object="state.formData.value"
          :enable-json-linter="false"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          allow-primitive
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

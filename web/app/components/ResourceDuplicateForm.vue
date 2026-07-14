<script setup>
import { ListConstant, LoaderConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  itemLabel: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  formData: {
    name: '',
  },
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionDuplicate'), item: props.itemLabel })"
    :on-submit="submit"
    :on-discard="props.onCancel"
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
          :rules="(
            $validator
              .defineField(label)
              .required()
              .stringLengthLte(64)
              .notStartsWith('default')
              .collect()
          )"
        />
      </AppInputGroup>
      <!-- Only show knowledge bases unused -->
      <ResourceKnowledgeBasePaginatedSelect
        v-if="props.module === ResourceConstant.Type.LOADER.module"
        v-model="state.formData.knowledgeBaseId"
        :return-object="false"
        :filter-logic="ListConstant.FilterLogic.AND"
        :filters="[
          { field: 'loader_id', operator: '=', value: null },
          { field: 'knowledge_base_type', operator: '=', value: findField(LoaderConstant.Type, props.item.loaderType, 'supportedKnowledgeBaseType') },
        ]"
        required
      />
    </template>
  </AppForm>
</template>

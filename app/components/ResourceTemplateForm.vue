<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Template } from '~/models/server/template'
 */

/**
 * @type {{ resource: Template }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
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
  /**
   * @type {Template}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldTemplate') })"
    :icon="ResourceConstant.Type.TEMPLATE.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceTemplateFormFields
        v-model:form-data="state.formData"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>

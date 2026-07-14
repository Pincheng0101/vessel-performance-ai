<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Storage } from '~/models/server/storage'
 */

/**
 * @type {{ resource: Storage }}
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
   * @type {Storage}
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldStorage') })"
    :icon="ResourceConstant.Type.STORAGE.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceStorageFormFields
        v-model:form-data="state.formData"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>

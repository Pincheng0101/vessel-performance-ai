<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Loader, LoaderErrorResponse } from '~/models/server/loader'
 */

/**
 * @type {{ resource: Loader, errors: LoaderErrorResponse }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  errors: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
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
   * @type {Loader}
   */
  formData: {},
  /**
   * @type {LoaderErrorResponse}
   */
  errors: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

if (props.errors) {
  state.errors = props.errors;
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldLoader') })"
    :icon="ResourceConstant.Type.LOADER.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceLoaderFormFields
        v-model:form-data="state.formData"
        v-model:errors="state.errors"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </template>
  </AppForm>
</template>

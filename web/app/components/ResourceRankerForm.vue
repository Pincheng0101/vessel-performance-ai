<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Ranker } from '~/models/server/ranker'
 */

/**
 * @type {{ resource: Ranker }}
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
   * @type {Ranker}
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldRanker') })"
    :icon="ResourceConstant.Type.RANKER.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceRankerFormFields
        v-model:form-data="state.formData"
        :not-found-resource="props.notFoundResource"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>

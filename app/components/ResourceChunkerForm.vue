<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Chunker } from '~/models/server/chunker'
 */

/**
 * @type {{ resource: Chunker }}
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
   * @type {Chunker}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
  if (state.formData.separators) {
    state.formData.separators = state.formData.separators.map(strUtils.escapeControlChars);
  }
}

const submit = async () => {
  /**
   * @type {Chunker}
   */
  const formData = objUtils.toRaw(state.formData);
  if (formData.separators) {
    formData.separators = formData.separators.map(strUtils.unescapeControlChars);
  }
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldChunker') })"
    :icon="ResourceConstant.Type.CHUNKER.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceChunkerFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </template>
  </AppForm>
</template>

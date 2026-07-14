<script setup>
import { AccountConstant } from '~/constants';

/**
 * @import { ApplicationApiKey } from '~/models/server/applicationApiKey'
 */

/**
 * @type {{ resource: ApplicationApiKey }}
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
   * @type {ApplicationApiKey}
   */
  formData: {
    applicationApiKeyProperties: {
      description: null,
      groups: [],
    },
  },
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t(AccountConstant.Base.APPLICATION_API_KEY.i18nTitle) })"
    :icon="AccountConstant.Base.APPLICATION_API_KEY.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountApplicationApiKeyFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>

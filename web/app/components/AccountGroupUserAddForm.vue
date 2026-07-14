<script setup>
/**
 * @import { User } from '~/models/server/user'
 */

/**
 * @type {{ users: User }}
 */
const props = defineProps({
  users: {
    type: Object,
    default: null,
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
   * @type {User}
   */
  formData: {},
});

if (props.users) {
  state.formData = objUtils.toRaw(props.users);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleAddUserToGroup')"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AccountGroupUserAddFormFields
        v-model:form-data="state.formData"
        :not-found-resource="props.notFoundResource"
      />
    </template>
  </AppForm>
</template>

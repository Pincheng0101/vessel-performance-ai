<script setup>
/**
 * @import { ChatSession } from '~/models/server/chatSession'
 */

/**
 * @type {{ session: ChatSession }}
 */
const props = defineProps({
  session: {
    type: Object,
    default: () => {},
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
    sessionName: props.session.sessionName,
  },
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: $t('__fieldChat') })"
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
          v-model="state.formData.sessionName"
          autofocus
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

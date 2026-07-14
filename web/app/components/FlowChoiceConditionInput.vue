<script setup>
import { ChoiceItemCondition } from '~/models/workflow/state/choice';

const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  label: {
    type: String,
    default: null,
  },
});

const condition = defineModel('condition', {
  type: Object,
  default: null,
});

const { getConditionExpression } = useChoiceFlow();

const state = reactive({
  formData: ChoiceItemCondition.toFormData(condition.value),
});

const expression = computed(() => {
  return getConditionExpression(condition.value);
});

const submit = (formData) => {
  condition.value = ChoiceItemCondition.fromFormData(formData);
  state.formData = formData;
};
</script>

<template>
  <AppDialog
    width="100%"
    :on-submit="submit"
  >
    <template #activator="{ onOpen }">
      <AppTextarea
        :id="props.id"
        v-model="expression"
        append-inner-icon="mdi-pencil"
        auto-grow
        readonly
        :rules="(
          $validator
            .defineField(props.label)
            .required()
            .collect()
        )"
        class="clickable"
        @click:append-inner="onOpen"
        @click:control="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <FlowChoiceConditionForm
        :form-data="state.formData"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

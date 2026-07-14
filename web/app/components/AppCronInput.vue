<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  errorMessage: {
    type: String,
    default: null,
  },
});

const model = defineModel({
  type: String,
  default: null,
});

const submit = (value) => {
  model.value = value;
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <AppTextField
        :id="props.id"
        v-model="model"
        :error-messages="props.errorMessage"
        append-inner-icon="mdi-pencil"
        clearable
        readonly
        class="clickable"
        @click:control="onOpen"
        @click:append-inner="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <AppCronForm
        :expression="model"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

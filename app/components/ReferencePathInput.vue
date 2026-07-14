<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  label: {
    type: String,
    default: null,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: undefined,
  default: undefined,
});

const submit = (value) => {
  model.value = value;
};
</script>

<template>
  <AppDialog :on-submit="submit">
    <template #activator="{ onOpen }">
      <template v-if="typeof model === 'string'">
        <AppTextField
          :id="props.id"
          v-model="model"
          :required="props.required"
          append-inner-icon="mdi-pencil"
          readonly
          class="clickable"
          :rules="(
            $validator
              .defineField(props.label)
              .when({
                required: props.required,
              })
              .required()
              .collect()
          )"
          @click:control="onOpen"
          @click:append-inner="onOpen"
        />
      </template>
      <template v-else>
        <AppJsonEditor
          :id="props.id"
          v-model:object="model"
          :required="props.required"
          readonly
          class="clickable"
          :rules="(
            $validator
              .defineField(props.label)
              .when({
                required: props.required,
              })
              .required()
              .collect()
          )"
          @click="onOpen"
        />
      </template>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <ReferencePathForm
        :reference-path="model"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>

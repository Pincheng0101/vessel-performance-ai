<script setup>
const form = ref(null);

const props = defineProps({
  mcpServerId: {
    type: String,
    required: true,
  },
  toolName: {
    type: String,
    required: true,
  },
  inputSchema: {
    type: Object,
    default: () => ({}),
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onClear: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  formData: {},
  isLoading: false,
});

const handleSubmit = async () => {
  if (!(await form.value.validate()).valid) return;

  state.isLoading = true;
  await props.onSubmit({
    mcpServerId: props.mcpServerId,
    toolName: props.toolName,
    input: state.formData,
  });
  state.isLoading = false;
};
</script>

<template>
  <v-form
    ref="form"
    @submit.prevent=""
  >
    <AppJsonSchemaRendererInputGroup
      v-model:form-data="state.formData"
      :schema="props.inputSchema"
    />
  </v-form>
  <div class="d-flex justify-end ga-2">
    <AppButton
      :aria-label="$t('__actionClear')"
      :text="$t('__actionClear')"
      :width="120"
      @click="() => {
        state.formData = {};
        props.onClear();
      }"
    />
    <AppButton
      color="primary"
      :aria-label="$t('__actionTest')"
      :text="$t('__actionTest')"
      :width="120"
      :loading="state.isLoading"
      @click="handleSubmit"
    />
  </div>
</template>

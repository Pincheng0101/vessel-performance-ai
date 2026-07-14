<script setup>
const inputSchema = defineModel('inputSchema', {
  type: Object,
  default: null,
});

const code = defineModel('code', {
  type: String,
  default: '',
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldCode')"
    :tooltip="$t('__tooltipResourceMcpServerCustomToolCode')"
    required
  >
    <AppPythonEditor
      :id="id"
      v-model="code"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ label }"
    :label="$t('__fieldInputSchema')"
    :tooltip="$t('__tooltipResourceMcpServerCustomToolInputSchema')"
  >
    <AppJsonSchemaBuilderInput
      v-model:form-data="inputSchema"
      :label="label"
    />
  </AppInputGroup>
</template>

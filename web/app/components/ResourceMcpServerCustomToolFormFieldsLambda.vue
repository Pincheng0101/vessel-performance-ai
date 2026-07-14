<script setup>
import { LambdaConstant } from '~/constants';

const inputSchema = defineModel('inputSchema', {
  type: Object,
  default: null,
});

const lambdaFunctionId = defineModel('lambdaFunctionId', {
  type: String,
  default: null,
});

const lambdaFunctionName = defineModel('lambdaFunctionName', {
  type: String,
  default: null,
});

const payload = defineModel('payload', {
  type: Object,
  default: null,
});

const state = reactive({
  referenceMode: lambdaFunctionId.value
    ? LambdaConstant.FunctionReferenceMode.RESOURCE.value
    : (lambdaFunctionName.value ? LambdaConstant.FunctionReferenceMode.NAME.value : LambdaConstant.FunctionReferenceMode.RESOURCE.value),
});

const lambdaModeItems = computed(() => Object.values(LambdaConstant.FunctionReferenceMode).map(m => ({ title: $t(m.i18nTitle), icon: m.icon, value: m.value })));

const handleReferenceModeChange = () => {
  if (state.referenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value) {
    lambdaFunctionName.value = null;
    return;
  }
  lambdaFunctionId.value = null;
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldLambdaFunctionReference')"
  >
    <AppSelect
      :id="id"
      v-model="state.referenceMode"
      :items="lambdaModeItems"
      @update:model-value="handleReferenceModeChange"
    />
  </AppInputGroup>
  <template v-if="state.referenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value">
    <ResourceLambdaFunctionPaginatedSelect
      v-model="lambdaFunctionId"
      :tooltip="$t('__tooltipLambdaFunctionResource')"
      required
    />
  </template>
  <template v-else-if="state.referenceMode === LambdaConstant.FunctionReferenceMode.NAME.value">
    <AppInputGroup
      v-slot="{ id, label }"
      :label="$t('__fieldLambdaFunctionName')"
      :tooltip="$t('__tooltipLambdaFunctionName')"
      required
    >
      <AppTextField
        :id="id"
        v-model="lambdaFunctionName"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
  </template>
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
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldPayload')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="payload"
      :rules="(
        $validator
          .defineField(label)
          .json()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

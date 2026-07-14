<script setup>
import { AgentConstant, LambdaConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  formData: {},
  lambdaReferenceMode: LambdaConstant.FunctionReferenceMode.RESOURCE.value,
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}
state.formData.trackToolResults ??= AgentConstant.ToolType.LAMBDA.defaultTrackToolResults;
state.lambdaReferenceMode = state.formData.lambdaFunctionId
  ? LambdaConstant.FunctionReferenceMode.RESOURCE.value
  : (state.formData.functionName ? LambdaConstant.FunctionReferenceMode.NAME.value : LambdaConstant.FunctionReferenceMode.RESOURCE.value);

const handleLambdaReferenceModeChange = () => {
  if (state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value) {
    state.formData.functionName = null;
    return;
  }
  state.formData.lambdaFunctionId = null;
};

const normalizeSchema = (schema) => {
  if (
    schema
    && schema.type === 'object'
    && objUtils.isEmpty(schema.properties)
    && arrUtils.isEmpty(schema.required)
  ) {
    return null;
  }
  return schema;
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit({
    ...formData,
    toolType: AgentConstant.ToolType.LAMBDA.value,
  });
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyToolItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldLambda') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        :tooltip="$t('__tooltipAgentToolName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.usedNames, props.item ? props.item.name : null)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDescription')"
        required
      >
        <AppTextarea
          :id="id"
          v-model="state.formData.description"
          :rows="10"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .stringLengthLte(AgentConstant.DefaultParams.DESCRIPTION.maxLength)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldLambdaFunctionReference')"
      >
        <AppSelect
          :id="id"
          v-model="state.lambdaReferenceMode"
          :items="Object.values(LambdaConstant.FunctionReferenceMode).map(m => ({ title: $t(m.i18nTitle), icon: m.icon, value: m.value }))"
          @update:model-value="handleLambdaReferenceModeChange"
        />
      </AppInputGroup>
      <template v-if="state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.RESOURCE.value">
        <ResourceLambdaFunctionPaginatedSelect
          v-model="state.formData.lambdaFunctionId"
          :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.LAMBDA_FUNCTION.module ? props.notFoundResource.id : null"
          :tooltip="$t('__tooltipLambdaFunctionResource')"
          required
        />
      </template>
      <template v-else-if="state.lambdaReferenceMode === LambdaConstant.FunctionReferenceMode.NAME.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldLambdaFunctionName')"
          :tooltip="$t('__tooltipLambdaFunctionName')"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.formData.functionName"
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
        :tooltip="$t('__tooltipAgentLambdaInputSchema')"
      >
        <AppJsonSchemaBuilderInput
          v-model:form-data="state.formData.inputSchema"
          :label="label"
          :hidden-fields="props.hiddenFields"
          @update:form-data="value => state.formData.inputSchema = normalizeSchema(value)"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldBaseInputSchema')"
        :tooltip="$t('__tooltipAgentLambdaBaseInputSchema')"
      >
        <AppJsonSchemaBuilderInput
          v-model:form-data="state.formData.baseInputSchema"
          :label="label"
          :hidden-fields="props.hiddenFields"
          @update:form-data="value => state.formData.baseInputSchema = normalizeSchema(value)"
        />
      </AppInputGroup>
      <AppFormFieldExpansionPanels>
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldDisplayName')"
            :tooltip="$t('__tooltipAgentDisplayName')"
          >
            <AppTextField
              :id="id"
              v-model="state.formData.displayName"
              :rules="(
                $validator
                  .defineField(label)
                  .stringLengthLte(64)
                  .collect()
              )"
            />
          </AppInputGroup>
          <ResourceAgentToolTagsField v-model:object="state.formData.tags" />
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
    </template>
  </AppForm>
</template>

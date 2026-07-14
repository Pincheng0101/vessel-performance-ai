<script setup>
import { AgentConstant, ConnectorConstant, HttpConstant, ResourceConstant } from '~/constants';

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
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}
state.formData.trackToolResults ??= AgentConstant.ToolType.API.defaultTrackToolResults;
state.formData.timeout ??= AgentConstant.DefaultParams.REQUEST_TIMEOUT.default;

const normalizeInputSchema = (inputSchema) => {
  if (
    inputSchema
    && inputSchema.type === 'object'
    && objUtils.isEmpty(inputSchema.properties)
    && arrUtils.isEmpty(inputSchema.required)
  ) {
    return null;
  }
  return inputSchema;
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit({
    ...formData,
    toolType: AgentConstant.ToolType.API.value,
  });
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyToolItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldApi') })"
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
        v-slot="{ id, label }"
        :label="$t('__fieldMethod')"
        :tooltip="$t('__tooltipHttpMethod')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.formData.method"
          :items="Object.values(HttpConstant.Method)"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <ResourceConnectorPaginatedSelect
        v-model="state.formData.connectorId"
        :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.CONNECTOR.module ? props.notFoundResource.id : null"
        :filters="[
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.HTTP.value },
        ]"
        :return-object="false"
        clearable
        :tooltip="$t('__tooltipHttpConnector')"
      />
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldUrl')"
        :tooltip="$t('__tooltipHttpUrl')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.url"
          :rules="(
            $validator
              .defineField(label)
              .httpOrHttps()
              .url()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldInputSchema')"
      >
        <AppJsonSchemaBuilderInput
          v-model:form-data="state.formData.inputSchema"
          :label="label"
          @update:form-data="value => state.formData.inputSchema = normalizeInputSchema(value)"
        />
      </AppInputGroup>
      <AppInputGroup
        :label="$t('__fieldParameter', 2)"
        :tooltip="$t('__tooltipHttpParams')"
      >
        <AppKeyValuePairTable
          v-model:object="state.formData.params"
          :item-label="$t('__fieldParameter')"
          :key-field-label="$t('__fieldName')"
        />
      </AppInputGroup>
      <AppInputGroup
        :label="$t('__fieldBody')"
        :tooltip="$t('__tooltipHttpBody')"
      >
        <AppKeyValuePairTable
          v-model:object="state.formData.body"
          :item-label="$t('__fieldField')"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldTimeout')"
      >
        <AppTextField
          :id="id"
          v-model.integer="state.formData.timeout"
          type="number"
          :min="AgentConstant.DefaultParams.REQUEST_TIMEOUT.min"
          :max="AgentConstant.DefaultParams.REQUEST_TIMEOUT.max"
          clearable
          :rules="(
            $validator
              .defineField(label)
              .when({
                integer: state.formData.timeout !== null,
                gte: state.formData.timeout !== null,
                lte: state.formData.timeout !== null,
              })
              .integer()
              .gte(AgentConstant.DefaultParams.REQUEST_TIMEOUT.min)
              .lte(AgentConstant.DefaultParams.REQUEST_TIMEOUT.max)
              .collect()
          )"
          @update:model-value="(value) => {
            if (strUtils.isEmpty(value)) {
              state.formData.timeout = AgentConstant.DefaultParams.REQUEST_TIMEOUT.default;
            }
          }"
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
          <AppInputGroup
            v-slot="{ label }"
            :label="$t('__fieldHttpHeader', 2)"
            :tooltip="$t('__tooltipHttpHeaderMergeWithConnector')"
          >
            <AppHttpHeaderTable
              v-model:object="state.formData.headers"
              :aria-label="label"
            />
          </AppInputGroup>
          <ResourceAgentToolTagsField v-model:object="state.formData.tags" />
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
    </template>
  </AppForm>
</template>

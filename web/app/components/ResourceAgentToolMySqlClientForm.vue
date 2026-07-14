<script setup>
import { AgentConstant, ConnectorConstant, ResourceConstant } from '~/constants';

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
state.formData.trackToolResults ??= AgentConstant.ToolType.MYSQL_CLIENT.defaultTrackToolResults;
state.formData.readOnly ??= true;

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit({
    ...formData,
    toolType: AgentConstant.ToolType.MYSQL_CLIENT.value,
  });
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyToolItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldMySql') })"
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
      <ResourceConnectorPaginatedSelect
        v-model="state.formData.connectorId"
        :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.CONNECTOR.module ? props.notFoundResource.id : null"
        :filters="[
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.MYSQL.value },
        ]"
        :return-object="false"
        required
        :tooltip="$t('__tooltipAgentMySqlConnector')"
      />
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDatabase')"
        :tooltip="$t('__tooltipAgentMySqlDatabase')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.database"
          :rules="(
            $validator
              .defineField(label)
              .collect()
          )"
          clearable
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldReadOnly')"
        :tooltip="$t('__tooltipAgentMySqlReadOnly')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.readOnly"
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

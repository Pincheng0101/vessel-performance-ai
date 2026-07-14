<script setup>
import { AgentConstant, AthenaConstant, ConnectorConstant, ResourceConstant } from '~/constants';

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
state.formData.trackToolResults ??= AgentConstant.ToolType.ATHENA_CLIENT.defaultTrackToolResults;
state.formData.readOnly ??= true;

if (state.formData.workgroup) {
  state.formData.executionSettingType = AthenaConstant.ExecutionSettingType.WORKGROUP.value;
}

if (state.formData.outputLocation) {
  state.formData.executionSettingType = AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value;
}

const handleExecutionSettingTypeChange = () => {
  state.formData.workgroup = null;
  state.formData.outputLocation = null;
};

const submit = async () => {
  const { executionSettingType, ...formData } = objUtils.toRaw(state.formData);
  await props.onSubmit({
    ...formData,
    toolType: AgentConstant.ToolType.ATHENA_CLIENT.value,
    outputLocation: executionSettingType === AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value ? formData.outputLocation : null,
    workgroup: executionSettingType === AthenaConstant.ExecutionSettingType.WORKGROUP.value ? formData.workgroup : null,
  });
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyToolItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldAthena') })"
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
          { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.AWS.value },
        ]"
        :return-object="false"
        :tooltip="$t('__tooltipAgentAthenaConnector')"
        clearable
      />
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldDatabase')"
        :tooltip="$t('__tooltipAgentAthenaDatabase')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.database"
          clearable
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldAthenaExecutionSettingType')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.formData.executionSettingType"
          :items="Object.values(AthenaConstant.ExecutionSettingType).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="handleExecutionSettingTypeChange"
        />
      </AppInputGroup>
      <template v-if="state.formData.executionSettingType === AthenaConstant.ExecutionSettingType.WORKGROUP.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldWorkgroup')"
          :tooltip="$t('__tooltipAgentAthenaWorkgroup')"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.formData.workgroup"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            clearable
          />
        </AppInputGroup>
      </template>
      <template v-else-if="state.formData.executionSettingType === AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldOutputLocation')"
          :tooltip="$t('__tooltipAgentAthenaOutputLocation')"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.formData.outputLocation"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .startsWith('s3://')
                .collect()
            )"
            clearable
          />
        </AppInputGroup>
      </template>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldCatalog')"
        :tooltip="$t('__tooltipAgentAthenaCatalog')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.catalog"
          clearable
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldReadOnly')"
        :tooltip="$t('__tooltipAgentAthenaReadOnly')"
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

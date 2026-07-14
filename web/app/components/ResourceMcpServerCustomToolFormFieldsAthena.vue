<script setup>
import { AthenaConstant, ConnectorConstant } from '~/constants';

const connectorId = defineModel('connectorId', {
  type: String,
  default: null,
});

const database = defineModel('database', {
  type: String,
  default: null,
});

const workgroup = defineModel('workgroup', {
  type: String,
  default: null,
});

const outputLocation = defineModel('outputLocation', {
  type: String,
  default: null,
});

const catalog = defineModel('catalog', {
  type: String,
  default: null,
});

const readOnly = defineModel('readOnly', {
  type: Boolean,
  default: true,
});

const executionSettingType = ref(null);

if (workgroup.value) {
  executionSettingType.value = AthenaConstant.ExecutionSettingType.WORKGROUP.value;
} else if (outputLocation.value) {
  executionSettingType.value = AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value;
}

const handleExecutionSettingTypeChange = () => {
  workgroup.value = null;
  outputLocation.value = null;
};
</script>

<template>
  <ResourceConnectorPaginatedSelect
    v-model="connectorId"
    :filters="[
      { field: 'connector_type', operator: '=', value: ConnectorConstant.Type.AWS.value },
    ]"
    :return-object="false"
    :tooltip="$t('__tooltipResourceMcpServerCustomToolAthenaConnector')"
    required
  />
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldDatabase')"
    :tooltip="$t('__tooltipAgentAthenaDatabase')"
  >
    <AppTextField
      :id="id"
      v-model="database"
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
      v-model="executionSettingType"
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
  <template v-if="executionSettingType === AthenaConstant.ExecutionSettingType.WORKGROUP.value">
    <AppInputGroup
      v-slot="{ id, label }"
      :label="$t('__fieldWorkgroup')"
      :tooltip="$t('__tooltipAgentAthenaWorkgroup')"
      required
    >
      <AppTextField
        :id="id"
        v-model="workgroup"
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
  <template v-else-if="executionSettingType === AthenaConstant.ExecutionSettingType.OUTPUT_LOCATION.value">
    <AppInputGroup
      v-slot="{ id, label }"
      :label="$t('__fieldOutputLocation')"
      :tooltip="$t('__tooltipAgentAthenaOutputLocation')"
      required
    >
      <AppTextField
        :id="id"
        v-model="outputLocation"
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
      v-model="catalog"
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
      v-model="readOnly"
    />
  </AppInputGroup>
</template>

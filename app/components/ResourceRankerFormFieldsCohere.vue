<script setup>
import { AwsConstant, RankerConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const modelId = defineModel('modelId', {
  type: String,
  default: null,
});

const region = defineModel('region', {
  type: String,
  default: null,
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('modelId')"
    v-slot="{ id, label }"
    :label="$t('__fieldModel')"
    required
  >
    <AppSelect
      :id="id"
      v-model="modelId"
      :items="Object.values(RankerConstant.CohereModel)"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('region')"
    v-slot="{ id, label }"
    :label="$t('__fieldRegion')"
    required
  >
    <AppSelect
      :id="id"
      v-model="region"
      :items="[
        {
          title: AwsConstant.Region.AP_NORTHEAST_1.title,
          value: AwsConstant.Region.AP_NORTHEAST_1.value,
        },
        {
          title: AwsConstant.Region.CA_CENTRAL_1.title,
          value: AwsConstant.Region.CA_CENTRAL_1.value,
        },
        {
          title: AwsConstant.Region.US_WEST_2.title,
          value: AwsConstant.Region.US_WEST_2.value,
        },
      ]"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>

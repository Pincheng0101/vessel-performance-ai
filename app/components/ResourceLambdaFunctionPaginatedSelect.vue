<script setup>
import { ResourceConstant } from '~/constants';
import ResourceLambdaFunctionForm from './ResourceLambdaFunctionForm';

const props = defineProps({
  returnObject: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
});

const model = defineModel({
  type: [String, Object],
  default: null,
});

const restoredObjects = defineModel('restoredObjects', {
  type: [String, Object],
  default: null,
});
</script>

<template>
  <ResourcePaginatedSelect
    v-model="model"
    v-model:restored-objects="restoredObjects"
    :field-name="$t('__fieldLambdaFunction', 1)"
    :instruction="$t('__instructionResourceLambdaFunction')"
    :module="ResourceConstant.Type.LAMBDA_FUNCTION.module"
    :form-component="ResourceLambdaFunctionForm"
    :title="$t('__fieldLambdaFunction', 2)"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'lambda_function_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, item.id), target: '_blank' }) },
      { title: $t('__fieldLambdaArn'), key: 'lambdaArn' },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :return-object="props.returnObject"
    :required="props.required"
    :not-found-object-id="props.notFoundObjectId"
  />
</template>

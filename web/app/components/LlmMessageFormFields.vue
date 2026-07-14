<script setup>
import { JsonSchemaConstant, LlmConstant } from '~/constants';

/**
 * @import { MessageActionExecutionPayload } from '~/models/server/message'
 */

const props = defineProps({
  llmType: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: '',
  },
  onlyUserRole: {
    type: Boolean,
    default: false,
  },
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
  },
});

/**
 * @type {Ref<MessageActionExecutionPayload>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const supportedRoles = computed(() => findField(LlmConstant.Type, props.llmType, 'supportedMessageRoles'));

const allowedRoles = computed(() => {
  if (props.onlyUserRole) {
    return [LlmConstant.MessageRole.USER.value];
  }
  return supportedRoles.value;
});

const roleOptions = computed(() => {
  return Object.values(LlmConstant.MessageRole)
    .filter(item => supportedRoles.value.includes(item.value))
    .map(item => ({
      ...item,
      title: $t(item.i18nTitle),
      subtitle: $t(item.i18nSubtitle),
      disabled: !allowedRoles.value.includes(item.value),
    }));
});
</script>

<template>
  <ReferencePathInputGroup
    v-model="formData.role"
    :label="$t('__fieldRole')"
    :enable-reference-path-switch="props.enableReferencePathSwitch"
    required
  >
    <template #default="{ id, label }">
      <AppSelect
        :id="id"
        v-model="formData.role"
        :items="roleOptions"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .oneOf(allowedRoles)
            .collect()
        )"
      />
    </template>
  </ReferencePathInputGroup>
  <ReferencePathInputGroup
    v-model="formData.content"
    :label="$t('__fieldContent', 2)"
    :enable-reference-path-switch="props.enableReferencePathSwitch"
    :expected-value-types="[JsonSchemaConstant.DataType.ARRAY.value]"
    required
  >
    <template #default="{ label }">
      <ContentBlockTable
        v-model="formData.content"
        :aria-label="label"
        :llm-id="props.llmId"
        :llm-type="props.llmType"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </template>
  </ReferencePathInputGroup>
</template>

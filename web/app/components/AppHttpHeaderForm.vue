<script setup>
import { HttpConstant } from '~/constants';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
  enableSecretValueObject: {
    type: Boolean,
    default: false,
  },
});

const state = reactive({
  formData: {},
});

const HEADER_OPTION_MAP = {
  [HttpConstant.HeaderName.ACCEPT]: HttpConstant.AcceptOptions,
  [HttpConstant.HeaderName.CONTENT_TYPE]: HttpConstant.ContentTypeOptions,
};

if (props.enableSecretValueObject) {
  state.formData.isSecret = false;
}

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldHttpHeader') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldKey')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.key"
          :items="Object.values(HttpConstant.HeaderName)"
          :multiple="false"
          :chips="false"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.items.map(item => item.key), props.item ? props.item.key : null)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldValue')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.value"
          :items="HEADER_OPTION_MAP[state.formData.key] || []"
          :multiple="false"
          :chips="false"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="props.enableSecretValueObject"
        v-slot="{ id }"
        :label="$t('__fieldSensitive')"
        :tooltip="$t('__tooltipHttpHeaderIsSecret')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.isSecret"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

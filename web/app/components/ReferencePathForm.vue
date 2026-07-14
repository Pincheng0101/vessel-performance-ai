<script setup>
import { ExternalMemoryConstant, StateConstant } from '~/constants';
import AppSelect from './AppSelect.vue';

const props = defineProps({
  referencePath: {
    type: [String, Object],
    default: null,
  },
  additionalPathOptions: {
    type: Array,
    default: () => [],
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
  source: StateConstant.Source.STATE_INPUT.value,
  externalMemoryType: null,
  id: null,
  ids: null,
  referencePath: '$',
});

const initializeState = () => {
  const referencePath = referencePathUtils.removeSuffixes(props.referencePath);
  if (referencePath) {
    if (referencePathUtils.isExternalMemoryObject(referencePath)) {
      state.source = referencePath.type;
      state.referencePath = referencePath.jsonpath;
      switch (referencePath.type) {
        case ExternalMemoryConstant.Type.EXTERNAL_MEMORY.value:
          state.id = referencePath.id;
          break;
        case ExternalMemoryConstant.Type.EXTERNAL_MEMORY_LIST.value:
          state.ids = referencePath.ids;
          break;
        case ExternalMemoryConstant.Type.VARIABLE.value:
          state.id = referencePath.id;
          break;
      }
      return;
    }
    state.referencePath = referencePath;
  }
};

initializeState();

const submit = async () => {
  let referencePath;
  switch (state.source) {
    case ExternalMemoryConstant.Type.EXTERNAL_MEMORY.value:
      referencePath = {
        type: ExternalMemoryConstant.Type.EXTERNAL_MEMORY.value,
        id: state.id,
        jsonpath: state.referencePath,
      };
      break;
    case ExternalMemoryConstant.Type.EXTERNAL_MEMORY_LIST.value:
      referencePath = {
        type: ExternalMemoryConstant.Type.EXTERNAL_MEMORY_LIST.value,
        ids: state.ids,
        jsonpath: state.referencePath,
      };
      break;
    case ExternalMemoryConstant.Type.VARIABLE.value:
      referencePath = {
        type: ExternalMemoryConstant.Type.VARIABLE.value,
        id: state.id,
        jsonpath: state.referencePath,
      };
      break;
    default:
      referencePath = state.referencePath;
      break;
  }
  await props.onSubmit(referencePathUtils.addSuffixes(referencePath));
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.referencePath ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldReferencePath') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldSource')"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.source"
          :items="[
            ...Object.values(StateConstant.Source),
            ...Object.values(ExternalMemoryConstant.Type),
          ].map(item => ({ ...item, title: $t(item.i18nTitle) }))"
          required
        />
      </AppInputGroup>
      <template v-if="state.source === ExternalMemoryConstant.Type.EXTERNAL_MEMORY.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldId')"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.id"
            required
            :rules="(
              $validator
                .defineField(label)
                .when({
                  jsonPath: String(state.id).startsWith('$'),
                })
                .required()
                .apply('jsonPath')
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <template v-else-if="state.source === ExternalMemoryConstant.Type.EXTERNAL_MEMORY_LIST.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldId', 2)"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.ids"
            required
            :rules="(
              $validator
                .defineField(label)
                .when({
                  jsonPath: String(state.ids).startsWith('$'),
                })
                .required()
                .apply('jsonPath')
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <template v-else-if="state.source === ExternalMemoryConstant.Type.VARIABLE.value">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldId')"
          required
        >
          <AppTextField
            :id="id"
            v-model="state.id"
            required
            :rules="(
              $validator
                .defineField(label)
                .when({
                  jsonPath: String(state.id).startsWith('$'),
                })
                .required()
                .apply('jsonPath')
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldJsonPath')"
        required
      >
        <StateInputCombobox
          :id="id"
          v-model="state.referencePath"
          :label="label"
          required
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>

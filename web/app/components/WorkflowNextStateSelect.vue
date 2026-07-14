<script setup>
import { StateConstant } from '~/constants';
import { Node } from '~/models/workflow';

const props = defineProps({
  node: {
    type: Node,
    required: true,
  },
});

const { t } = useI18n();
const { findSiblingStates } = useWorkflow();

const model = defineModel({
  type: [String, null],
  default: null,
});

const state = reactive({
  items: [],
});

const isStartNode = computed(() => props.node.type === StateConstant.PseudoType.START.value);

const stateName = computed(() => isStartNode.value ? '' : props.node.data.stateDefinition.name);

const computeItems = (stateName) => {
  const siblingStates = findSiblingStates(stateName);
  const result = siblingStates.map(state => ({
    title: state.name,
    value: state.name,
  }));

  if (!isStartNode.value) {
    result.push({
      title: t('__fieldEnd'),
      value: null,
    });
  }
  state.items = result;
};

computeItems(stateName.value);

// Update items with debounce when stateName changes
watch(
  stateName,
  useDebounceFn((v) => {
    computeItems(v);
  }, 500),
);
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldNextState')"
    required
  >
    <AppSelect
      :id="id"
      v-model="model"
      :items="state.items"
      :rules="(
        $validator
          .defineField(label)
          .notEquals(undefined)
          .oneOf(state.items.map(item => item.value))
          .collect()
      )"
    />
  </AppInputGroup>
</template>

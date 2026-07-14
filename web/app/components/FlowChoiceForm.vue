<script setup>
import { useVueFlow } from '@vue-flow/core';
import { StateConstant } from '~/constants';
import { ChoiceItem, ChoiceItemDefinition, ChoiceNode, ChoiceNodeData, ChoiceStateDefinition } from '~/models/workflow/state/choice';

const props = defineProps({
  node: {
    type: ChoiceNode,
    required: true,
  },
  usedStateDefinitionNames: {
    type: Array,
    default: () => [],
  },
  onStateFormClose: {
    type: Function,
    default: null,
  },
  onUpdate: {
    type: Function,
    required: true,
  },
});

const { t } = useI18n();
const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {ChoiceNode}
   */
  formData: {},
});

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
}

const { updateNodeData } = useVueFlow();

const {
  createChoiceHandler,
  organizeFlow,
} = useWorkflow();

const handleNextStateUpdate = (v, choiceItem) => {
  if (choiceItem.isDefault) {
    state.formData.data.stateDefinition.defaultChoice = v;
  } else {
    choiceItem.stateDefinition.next = v;
    choiceItem.stateDefinition.end = v ? undefined : true;
    state.formData.data.stateDefinition.choices = state.formData.data.stateDefinition.choices.map((c) => {
      if (c.id === choiceItem.id) return objUtils.toRaw(choiceItem);
      return c;
    });
  }
  update();
};

const update = async () => {
  const stateDefinition = new ChoiceStateDefinition({
    ...state.formData.data.stateDefinition,
    choices: state.formData.data.stateDefinition.choices,
    defaultChoice: state.formData.data.stateDefinition.defaultChoice,
  });

  state.formData.data = new ChoiceNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};

const createChoiceItem = async () => {
  await nextTick();
  const choiceItem = new ChoiceItem({
    id: strUtils.uuid(),
    sourceHandle: strUtils.uuid(),
    stateDefinition: new ChoiceItemDefinition({
      end: true,
    }),
  });
  state.formData.data.stateDefinition.choices = [...state.formData.data.stateDefinition.choices, objUtils.toRaw(choiceItem)];
  const choiceHandler = createChoiceHandler();
  choiceHandler.createChoiceItem({
    choiceId: state.formData.id,
    choiceItem,
  });
  await organizeFlow();
  updateNodeData(props.node.id, objUtils.toRaw(state.formData.data));
};

const deleteChoiceItem = async (choiceItem) => {
  state.formData.data.stateDefinition.choices = state.formData.data.stateDefinition.choices.filter(c => c.id !== choiceItem.id);
  const choiceHandler = createChoiceHandler();
  choiceHandler.deleteChoiceItem({
    choiceId: state.formData.id,
    choiceItem,
  });
  await organizeFlow();
  updateNodeData(props.node.id, objUtils.toRaw(state.formData.data));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.Type.CHOICE.icon"
    :form-title="$t(StateConstant.Type.CHOICE.i18nTitle)"
    :form-title-icon-background="StateConstant.Type.CHOICE.iconColor"
    :is-form-group-valid="isFormGroupValid"
    :on-state-form-close="props.onStateFormClose"
    :on-state-form-validate="update"
    :state-definition="props.node.data.stateDefinition"
  >
    <template #config-fields>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.data.stateDefinition.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.usedStateDefinitionNames, props.node.data.stateDefinition.name)
              .collect()
          )"
          @update:model-value="() => {
            if (props.usedStateDefinitionNames.includes(state.formData.data.stateDefinition.name)) return;
            update();
          }"
        />
      </AppInputGroup>
      <AppInputLabel :label="$t('__fieldRule', 2)" />
      <AppInputGroupExpansionPanels>
        <AppInputGroupExpansionPanel class="mb-4">
          <template #title>
            <div class="d-flex flex-column align-start">
              <v-chip
                class="mb-2"
                variant="outlined"
                size="x-small"
              >
                {{ $t('__fieldDefault') }}
              </v-chip>
              <p>
                {{ $t('__workflowFlowChoiceDefaultRuleDescription') }}
              </p>
            </div>
          </template>
          <template #text>
            <WorkflowNextStateSelect
              v-model="state.formData.data.stateDefinition.defaultChoice"
              :node="props.node"
              @update:model-value="(v) => handleNextStateUpdate(v, state.formData.data.stateDefinition.choices.find(choiceItem => choiceItem.isDefault))"
            />
          </template>
        </AppInputGroupExpansionPanel>
        <AppInputGroupExpansionPanel
          v-for="(choiceItem, i) in state.formData.data.stateDefinition.choices.filter(choiceItem => !choiceItem.isDefault)"
          :key="choiceItem.id"
          class="mb-4"
        >
          <template #title>
            {{ `${t('__workflowFlowChoiceRule')} #${i + 1}` }}
          </template>
          <template #text>
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldCondition')"
              required
            >
              <FlowChoiceConditionInput
                :id="id"
                v-model:condition="choiceItem.stateDefinition.condition"
                :label="label"
                @update:condition="update"
              />
            </AppInputGroup>
            <WorkflowNextStateSelect
              v-model="choiceItem.stateDefinition.next"
              :node="props.node"
              @update:model-value="(v) => handleNextStateUpdate(v, choiceItem)"
            />
            <AppInputGroup
              v-slot="{ id }"
              :label="$t('__fieldComment')"
            >
              <AppTextField
                :id="id"
                v-model="choiceItem.stateDefinition.comment"
                @update:model-value="update"
              />
            </AppInputGroup>
            <div class="d-flex justify-end">
              <AppIconButton
                icon="mdi-trash-can"
                variant="text"
                @click="() => deleteChoiceItem(choiceItem)"
              />
            </div>
          </template>
        </AppInputGroupExpansionPanel>
      </AppInputGroupExpansionPanels>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldComment')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.data.stateDefinition.comment"
          @update:model-value="update"
        />
      </AppInputGroup>
      <AppButton
        color="primary"
        :text="$t('__actionAddNewChoiceRule')"
        @click="createChoiceItem"
      />
    </template>
    <template #input-output-fields>
      <WorkflowStateFormFieldsInputOutput
        v-model:form-data="state.formData.data.stateDefinition.inputOutput"
        :on-update="update"
      />
    </template>
  </WorkflowStateForm>
</template>

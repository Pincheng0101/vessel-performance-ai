<script setup>
import { ConditionConstant } from '~/constants';
import { ChoiceItemExpression } from '~/models/workflow/state/choice';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const { t } = useI18n();

const state = reactive(objUtils.toRaw(props.formData));

const statementOptions = [
  {
    title: ConditionConstant.ConditionalStatement.SIMPLE.title,
    value: ConditionConstant.ConditionalStatement.SIMPLE.value,
    subtitle: t('__subtitleWorkflowChoiceSimple'),
  },
  {
    title: ConditionConstant.ConditionalStatement.AND.title,
    value: ConditionConstant.ConditionalStatement.AND.value,
    subtitle: t('__subtitleWorkflowChoiceAnd'),
  },
  {
    title: ConditionConstant.ConditionalStatement.OR.title,
    value: ConditionConstant.ConditionalStatement.OR.value,
    subtitle: t('__subtitleWorkflowChoiceOr'),
  },
];

const isDeletable = computed(() => state.conditionalStatement !== ConditionConstant.ConditionalStatement.SIMPLE.value && state.expressions.length > 2);

const filteredExpressions = computed(() => state.conditionalStatement === ConditionConstant.ConditionalStatement.SIMPLE.value ? [state.expressions[0]] : state.expressions);

const firstExpression = computed(() => state.expressions[0]);

const removeExpression = (index) => {
  state.expressions.splice(index, 1);
};

const submit = async () => {
  await props.onSubmit(state);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: firstExpression ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldCondition') })"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <v-row>
        <v-col
          cols="12"
          sm="3"
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__workflowFlowChoiceConditionalStatement')"
            required
          >
            <AppSelect
              :id="id"
              v-model="state.conditionalStatement"
              :items="statementOptions"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              @update:model-value="(v) => {
                if ((v === ConditionConstant.ConditionalStatement.AND.value || v === ConditionConstant.ConditionalStatement.OR.value) && state.expressions.length <= 1) {
                  state.expressions.push(new ChoiceItemExpression());
                }
              }"
            />
          </AppInputGroup>
        </v-col>
      </v-row>
      <AppInputGroup bordered>
        <template
          v-for="(_, i) in filteredExpressions"
          :key="i"
        >
          <FlowChoiceConditionExpressionInputs
            v-model:expression="state.expressions[i]"
            :index="i"
            :conditional-statement="state.conditionalStatement"
            :is-deletable="isDeletable"
            :on-expression-remove="() => removeExpression(i)"
          />
        </template>
        <template v-if="state.conditionalStatement !== ConditionConstant.ConditionalStatement.SIMPLE.value">
          <div class="d-flex justify-center mb-4">
            <AppIconButton
              color="primary"
              icon="mdi-plus"
              :elevation="0"
              :on-click="() => state.expressions.push(new ChoiceItemExpression())"
            />
          </div>
        </template>
      </AppInputGroup>
    </template>
  </AppForm>
</template>

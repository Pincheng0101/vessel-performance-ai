<script setup>
import { ConditionConstant } from '~/constants';

const expression = defineModel('expression', {
  type: Object,
  default: null,
});

const props = defineProps({
  conditionalStatement: {
    type: String,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  onExpressionRemove: {
    type: Function,
    required: true,
  },
  isDeletable: {
    type: Boolean,
    required: true,
  },
});

const operatorOptions = Object.values(ConditionConstant.Operator);

const basicTypeOptions = Object.values(ConditionConstant.BasicType);

const detailedTypeOptions = Object.values(ConditionConstant.DetailedType);

const limitedDetailedTypeOptions = Object.values(ConditionConstant.DetailedType).filter(({ value }) => !value.toLowerCase().includes('boolean'));

const booleanOptions = Object.values(ConditionConstant.Boolean);

const operatorTypeValueMap = Object.freeze({
  [ConditionConstant.Operator.IS_PRESENT.value]: booleanOptions,
  [ConditionConstant.Operator.IS_OF_TYPE.value]: basicTypeOptions,
  [ConditionConstant.Operator.IS_EQUAL_TO.value]: detailedTypeOptions,
  [ConditionConstant.Operator.IS_LESS_THAN.value]: limitedDetailedTypeOptions,
  [ConditionConstant.Operator.IS_GREATER_THAN.value]: limitedDetailedTypeOptions,
  [ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value]: limitedDetailedTypeOptions,
  [ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value]: limitedDetailedTypeOptions,
});

const dynamicCols = computed(() => expression.value.valueType ? 2 : 4);
</script>

<template>
  <v-row>
    <v-col
      v-if="props.conditionalStatement !== ConditionConstant.ConditionalStatement.SIMPLE.value"
      cols="12"
      sm="1"
      class="d-flex justify-center align-center"
    >
      <template v-if="props.index > 0">
        <AppInputLabel :label="props.conditionalStatement.toUpperCase()" />
      </template>
    </v-col>
    <v-col
      cols="12"
      sm="2"
    >
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__workflowFlowChoiceNot')"
      >
        <AppSelect
          :id="id"
          v-model="expression.not"
          clearable
          :items="[
            { title: ConditionConstant.NotCondition.NOT.title, value: ConditionConstant.NotCondition.NOT.value },
          ]"
        />
      </AppInputGroup>
    </v-col>
    <v-col
      cols="12"
      sm="2"
    >
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__workflowFlowChoiceVariable')"
        required
      >
        <StateInputCombobox
          :id="id"
          v-model="expression.variable"
          required
          :label="label"
          menu-width="auto"
        />
      </AppInputGroup>
    </v-col>
    <v-col
      cols="12"
      sm="2"
    >
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__workflowFlowChoiceOperator')"
        required
      >
        <AppSelect
          :id="id"
          v-model="expression.operator"
          :items="operatorOptions"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          menu-width="auto"
          @update:model-value="() => {
            expression.value = '';
            expression.valueType = '';
          }"
        />
      </AppInputGroup>
    </v-col>
    <template v-if="expression.operator === ConditionConstant.Operator.IS_PRESENT.value">
      <v-col
        cols="12"
        :sm="dynamicCols"
      >
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__workflowFlowChoiceValue')"
          required
        >
          <AppSelect
            :id="id"
            v-model="expression.value"
            :items="booleanOptions"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
      </v-col>
    </template>
    <template v-else-if="expression.operator === ConditionConstant.Operator.MATCHES_STRING.value">
      <v-col
        cols="12"
        :sm="dynamicCols"
      >
        <AppInputGroup
          v-slot="{ id }"
          :label="$t('__workflowFlowChoiceValue')"
        >
          <AppTextField
            :id="id"
            v-model="expression.value"
          />
        </AppInputGroup>
      </v-col>
    </template>
    <template v-else-if="expression.operator === ConditionConstant.Operator.IS_OF_TYPE.value">
      <v-col
        cols="12"
        :sm="dynamicCols"
      >
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__workflowFlowChoiceValueType')"
          required
        >
          <AppSelect
            :id="id"
            v-model="expression.valueType"
            :items="operatorTypeValueMap[expression.operator]"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            @update:model-value="() => {
              expression.value = '';
            }"
          />
        </AppInputGroup>
      </v-col>
      <v-col
        v-if="expression.valueType"
        cols="12"
        :sm="dynamicCols"
      >
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__workflowFlowChoiceValue')"
          required
        >
          <AppSelect
            :id="id"
            v-model="expression.value"
            :items="booleanOptions"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </AppInputGroup>
      </v-col>
    </template>
    <template v-else>
      <v-col
        cols="12"
        :sm="dynamicCols"
      >
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__workflowFlowChoiceValueType')"
          required
        >
          <AppSelect
            :id="id"
            v-model="expression.valueType"
            :items="operatorTypeValueMap[expression.operator]"
            :disabled="!expression.operator"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            @update:model-value="() => {
              expression.value = '';
            }"
          />
        </AppInputGroup>
      </v-col>
      <template v-if="expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value">
        <v-col
          cols="12"
          sm="2"
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__workflowFlowChoiceValue')"
            required
          >
            <AppTextField
              :id="id"
              v-model.number="expression.value"
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            />
          </AppInputGroup>
        </v-col>
      </template>
      <template v-if="expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value">
        <v-col
          cols="12"
          sm="2"
        >
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__workflowFlowChoiceValue')"
          >
            <AppTextField
              :id="id"
              v-model="expression.value"
            />
          </AppInputGroup>
        </v-col>
      </template>
      <template v-if="expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value">
        <v-col
          cols="12"
          sm="2"
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__workflowFlowChoiceValue')"
            required
          >
            <AppTextField
              :id="id"
              v-model="expression.value"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .iso8601()
                  .collect()
              )"
            />
          </AppInputGroup>
        </v-col>
      </template>
      <template v-if="expression.valueType === ConditionConstant.DetailedType.BOOLEAN_CONSTANT.value">
        <v-col
          cols="12"
          sm="2"
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__workflowFlowChoiceValue')"
            required
          >
            <AppSelect
              :id="id"
              v-model="expression.value"
              :items="booleanOptions"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            />
          </AppInputGroup>
        </v-col>
      </template>
      <template v-if="expression.valueType.toLowerCase().includes('variable')">
        <v-col
          cols="12"
          sm="2"
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__workflowFlowChoiceValue')"
            required
          >
            <StateInputCombobox
              :id="id"
              v-model="expression.value"
              required
              :label="label"
              menu-width="auto"
            />
          </AppInputGroup>
        </v-col>
      </template>
    </template>
    <v-col sm="1">
      <template v-if="props.isDeletable">
        <AppInputLabel label="&nbsp;" />
        <v-sheet
          :height="40"
          color="transparent"
          class="d-flex align-center"
        >
          <AppIconButton
            icon="mdi-close"
            variant="text"
            @click="onExpressionRemove"
          />
        </v-sheet>
      </template>
    </v-col>
  </v-row>
</template>

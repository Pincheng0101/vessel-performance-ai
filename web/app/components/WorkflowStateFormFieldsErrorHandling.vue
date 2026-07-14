<script setup>
import { StateConstant, StateErrorConstant } from '~/constants';
import { ErrorHandlingCatch, ErrorHandlingRetry } from '~/models/workflow/state';

/**
 * @import { ErrorHandling } from '~/models/workflow/state'
 */

const props = defineProps({
  stateType: {
    type: String,
    default: StateConstant.Type.TASK.value,
  },
  stateName: {
    type: String,
    default: '',
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();
const { findSiblingStates } = useWorkflow();

/**
 * @type {Ref<ErrorHandling>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  isResultPathEnabledMap: {},
  isJitterStrategyEnabledMap: {},
  openedCatchPanelIndex: null,
  openedRetryPanelIndex: null,
  fallbackStateItems: [],
});

const GENERAL_ERROR_ITEMS = Object.values(StateErrorConstant.GeneralErrorType).map(value => ({
  title: t(value.i18nTitle),
  subtitle: t(value.i18nSubtitle),
  value: value.value,
}));

const LAMBDA_ERROR_ITEMS = Object.values(StateErrorConstant.LambdaErrorType).map(value => ({
  title: t(value.i18nTitle),
  subtitle: t(value.i18nSubtitle),
  value: value.value,
}));

const catchErrorEqualsItems = computed(() => GENERAL_ERROR_ITEMS);

const retryErrorEqualsItems = computed(() => props.stateType === StateConstant.Type.TASK.value ? [...LAMBDA_ERROR_ITEMS, ...GENERAL_ERROR_ITEMS] : GENERAL_ERROR_ITEMS);

{
  state.isResultPathEnabledMap = formData.value.catches.reduce((acc, catchItem) => {
    acc[catchItem.id] = catchItem.resultPath !== null;
    return acc;
  }, {});
}

{
  state.isJitterStrategyEnabledMap = formData.value.retries.reduce((acc, retryItem) => {
    acc[retryItem.id] = retryItem.jitterStrategy === StateErrorConstant.RetryJitterStrategyType.FULL.value;
    return acc;
  }, {});
}

{
  const siblingStates = findSiblingStates(props.stateName);
  if (siblingStates.length >= 0) {
    state.fallbackStateItems = siblingStates.map(state => ({
      title: state.name,
      value: state.name,
    }));
  }
}

const createCatchItem = () => {
  const catchItem = new ErrorHandlingCatch({
    id: strUtils.uuid(),
    errorEquals: [StateErrorConstant.GeneralErrorType.STATES_ALL.value],
    next: props.stateName,
  });
  if (!formData.value.catches) {
    formData.value.catches = [];
  }
  formData.value.catches.push(catchItem);
  props.onUpdate(formData.value);
  state.isResultPathEnabledMap[catchItem.id] = true;
  state.openedCatchPanelIndex = formData.value.catches.length - 1;
};

const deleteCatchItem = (id) => {
  const index = formData.value.catches.findIndex(item => item.id === id);
  if (index === -1) return;
  formData.value.catches.splice(index, 1);
  props.onUpdate(formData.value);
  delete state.isResultPathEnabledMap[id];
  state.openedCatchPanelIndex = null;
};

const createRetryItem = () => {
  const retryItem = new ErrorHandlingRetry({
    id: strUtils.uuid(),
    errorEquals: props.stateType === StateConstant.Type.TASK.value
      ? [
          StateErrorConstant.LambdaErrorType.LAMBDA_SERVICE_EXCEPTION.value,
          StateErrorConstant.LambdaErrorType.LAMBDA_AWS_LAMBDA_EXCEPTION.value,
          StateErrorConstant.LambdaErrorType.LAMBDA_SDK_CLIENT_EXCEPTION.value,
          StateErrorConstant.LambdaErrorType.LAMBDA_TOO_MANY_REQUESTS_EXCEPTION.value,
        ]
      : [
          StateErrorConstant.GeneralErrorType.STATES_ALL.value,
        ],
    intervalSeconds: StateErrorConstant.RetryParams.INTERVAL_SECONDS.default,
    maxAttempts: StateErrorConstant.RetryParams.MAX_ATTEMPTS.default,
    backoffRate: StateErrorConstant.RetryParams.BACKOFF_RATE.default,
    maxDelaySeconds: StateErrorConstant.RetryParams.MAX_DELAY_SECONDS.default,
    jitterStrategy: null,
  });
  if (!formData.value.retries) {
    formData.value.retries = [];
  }
  formData.value.retries.push(retryItem);
  props.onUpdate(formData.value);
  state.openedRetryPanelIndex = formData.value.retries.length - 1;
};

const deleteRetryItem = (id) => {
  const index = formData.value.retries.findIndex(item => item.id === id);
  if (index === -1) return;
  formData.value.retries.splice(index, 1);
  props.onUpdate(formData.value);
  delete state.isJitterStrategyEnabledMap[id];
  state.openedRetryPanelIndex = null;
};
</script>

<template>
  <AppInputGroup :label="$t('__fieldCatch')">
    <AppInputGroupExpansionPanels v-model="state.openedCatchPanelIndex">
      <AppInputGroupExpansionPanel
        v-for="(catchItem, i) in formData.catches"
        :key="catchItem.id"
        class="mb-4"
      >
        <template #title>
          {{ `${t('__fieldCatcher')} #${i + 1}` }}
        </template>
        <template #text>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldError', 2)"
            :tooltip="$t('__tooltipWorkflowErrorHandlingErrorEquals')"
            required
          >
            <AppCombobox
              :id="id"
              v-model="catchItem.errorEquals"
              :items="catchErrorEqualsItems"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              clearable
              @update:model-value="props.onUpdate"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldFallbackState')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingFallbackState')"
            required
          >
            <AppSelect
              :id="id"
              v-model="catchItem.next"
              :items="state.fallbackStateItems"
              :rules="(
                $validator
                  .defineField(label)
                  .oneOf(state.fallbackStateItems.map(item => item.value))
                  .required()
                  .collect()
              )"
              @update:model-value="props.onUpdate"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldStateResultPath')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingResultPath')"
          >
            <AppSelect
              v-model="state.isResultPathEnabledMap[catchItem.id]"
              :aria-label="$t('__titleSelect', { prefix: label })"
              :items="[
                {
                  title: $t('__fieldCombineOriginalInputWithResult'),
                  subtitle: $t('__subtitleCombineOriginalInputWithResult'),
                  value: true,
                },
                {
                  title: $t('__fieldDiscardResultAndKeepOriginalInput'),
                  subtitle: $t('__subtitleDiscardResultAndKeepOriginalInput'),
                  value: false,
                },
              ]"
              hide-details
              @update:model-value="(v) => {
                catchItem.resultPath = v ? null : '';
                props.onUpdate();
              }"
            />
            <div class="mt-2">
              <template v-if="state.isResultPathEnabledMap[catchItem.id]">
                <StateInputCombobox
                  :id="id"
                  v-model="catchItem.resultPath"
                  required
                  :label="label"
                  @update:model-value="props.onUpdate"
                />
              </template>
              <template v-else>
                <AppTextField
                  :id="id"
                  value="null"
                  readonly
                />
              </template>
            </div>
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldComment')"
          >
            <AppTextField
              :id="id"
              v-model="catchItem.comment"
              @update:model-value="props.onUpdate"
            />
          </AppInputGroup>
          <div class="d-flex justify-end">
            <AppIconButton
              icon="mdi-trash-can"
              variant="text"
              @click="() => deleteCatchItem(catchItem.id)"
            />
          </div>
        </template>
      </AppInputGroupExpansionPanel>
    </AppInputGroupExpansionPanels>
    <AppButton
      class="mb-4"
      color="primary"
      :text="$t('__actionAddNewCatcher')"
      @click="createCatchItem"
    />
  </AppInputGroup>
  <AppInputGroup :label="$t('__fieldRetry')">
    <AppInputGroupExpansionPanels v-model="state.openedRetryPanelIndex">
      <AppInputGroupExpansionPanel
        v-for="(retryItem, i) in formData.retries"
        :key="retryItem.id"
        class="mb-4"
      >
        <template #title>
          {{ `${t('__fieldRetrier')} #${i + 1}` }}
        </template>
        <template #text>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldError', 2)"
            :tooltip="$t('__tooltipWorkflowErrorHandlingErrorEquals')"
            required
          >
            <AppCombobox
              :id="id"
              v-model="retryItem.errorEquals"
              :items="retryErrorEqualsItems"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              clearable
              @update:model-value="props.onUpdate"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldIntervalSeconds')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingIntervalSeconds')"
          >
            <AppTextField
              :id="id"
              v-model.integer="retryItem.intervalSeconds"
              type="number"
              :min="StateErrorConstant.RetryParams.INTERVAL_SECONDS.min"
              :rules="(
                $validator
                  .defineField(label)
                  .gte(StateErrorConstant.RetryParams.INTERVAL_SECONDS.min)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  retryItem.intervalSeconds = null;
                }
                props.onUpdate();
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldMaxAttempts')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingMaxAttempts')"
          >
            <AppTextField
              :id="id"
              v-model.integer="retryItem.maxAttempts"
              type="number"
              :min="StateErrorConstant.RetryParams.MAX_ATTEMPTS.min"
              :rules="(
                $validator
                  .defineField(label)
                  .gte(StateErrorConstant.RetryParams.MAX_ATTEMPTS.min)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  retryItem.maxAttempts = null;
                }
                props.onUpdate();
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldBackoffRate')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingBackoffRate')"
          >
            <AppTextField
              :id="id"
              v-model.integer="retryItem.backoffRate"
              type="number"
              :min="StateErrorConstant.RetryParams.BACKOFF_RATE.min"
              :rules="(
                $validator
                  .defineField(label)
                  .gte(StateErrorConstant.RetryParams.BACKOFF_RATE.min)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  retryItem.backoffRate = null;
                }
                props.onUpdate();
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldMaxDelaySeconds')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingMaxDelaySeconds')"
          >
            <AppTextField
              :id="id"
              v-model.integer="retryItem.maxDelaySeconds"
              type="number"
              :min="StateErrorConstant.RetryParams.MAX_DELAY_SECONDS.min"
              :max="StateErrorConstant.RetryParams.MAX_DELAY_SECONDS.max"
              :rules="(
                $validator
                  .defineField(label)
                  .gte(StateErrorConstant.RetryParams.MAX_DELAY_SECONDS.min)
                  .lte(StateErrorConstant.RetryParams.MAX_DELAY_SECONDS.max)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  retryItem.maxDelaySeconds = null;
                }
                props.onUpdate();
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldAddJitter')"
            :tooltip="$t('__tooltipWorkflowErrorHandlingAddJitter')"
          >
            <AppSwitch
              :id="id"
              v-model="state.isJitterStrategyEnabledMap[retryItem.id]"
              @update:model-value="(v) => {
                retryItem.jitterStrategy = v ? StateErrorConstant.RetryJitterStrategyType.FULL.value : null;
                props.onUpdate();
              }"
            />
          </AppInputGroup>
          <div class="d-flex justify-end">
            <AppIconButton
              icon="mdi-trash-can"
              variant="text"
              @click="() => deleteRetryItem(retryItem.id)"
            />
          </div>
        </template>
      </AppInputGroupExpansionPanel>
    </AppInputGroupExpansionPanels>
    <AppButton
      class="mb-4"
      color="primary"
      :text="$t('__actionAddNewRetrier')"
      @click="createRetryItem"
    />
  </AppInputGroup>
</template>

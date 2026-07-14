<script setup>
import { DateConstant, FlowWaitConstant, StateConstant } from '~/constants';
import { WaitNode, WaitNodeData, WaitStateDefinition } from '~/models/workflow/state/wait';

const props = defineProps({
  node: {
    type: WaitNode,
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

const dayjs = useDayjs();
const { form, isFormGroupValid, validateFormGroup } = useWorkflowStateForm();

const state = reactive({
  /**
   * @type {WaitNode}
   */
  formData: {},
  type: StateConstant.WaitType.SECONDS,
  date: null,
  time: '',
  timeZone: '',
});

const parseTimestamp = (timestamp) => {
  const offset = timestamp.slice(-6);
  const parsed = dayjs(timestamp).utcOffset(offset);
  const date = parsed.toDate();
  const time = parsed.format(DateConstant.Format.TIME);
  const timeZone = parsed.format('Z');
  return {
    date,
    time,
    timeZone,
  };
};

// Restore the form data
{
  state.formData = objUtils.toRaw(props.node);
  const { stateDefinition } = state.formData.data;
  state.type = (stateDefinition.timestamp || stateDefinition.timestampPath) ? StateConstant.WaitType.TIMESTAMP : StateConstant.WaitType.SECONDS;
  // Use ?? operator to keep the original values
  state.formData.data.stateDefinition.seconds = stateDefinition.seconds ?? FlowWaitConstant.ActionExecutionParams.SECONDS.default;
  if (stateDefinition.timestamp) {
    const { date, time, timeZone } = parseTimestamp(stateDefinition.timestamp);
    state.date = date;
    state.time = time;
    state.timeZone = timeZone;
  }
}

const isSecondsType = computed(() => state.type === StateConstant.WaitType.SECONDS);
const isTimestampType = computed(() => state.type === StateConstant.WaitType.TIMESTAMP);

const seconds = computed(() => state.formData.data.stateDefinition.seconds);
const secondsPath = computed(() => state.formData.data.stateDefinition.secondsPath);
const timestamp = computed(() => state.date ? `${dayjs(state.date).format(DateConstant.Format.FULL_DATE)}T${state.time}${state.timeZone}` : null);
const timestampPath = computed(() => state.formData.data.stateDefinition.timestampPath);

const handleTypeChange = (v) => {
  if (v === StateConstant.WaitType.SECONDS) {
    state.formData.data.stateDefinition.seconds = FlowWaitConstant.ActionExecutionParams.SECONDS.default;
    update();
    return;
  }
  const today = dayjs();
  state.date = today.toDate();
  state.time = today.format(DateConstant.Format.TIME);
  state.timeZone = today.format('Z');
  update();
};

const handleNextStateUpdate = (v) => {
  state.formData.data.stateDefinition.next = v;
  state.formData.data.stateDefinition.end = v ? undefined : true;
  update();
};

const update = async () => {
  const stateDefinition = new WaitStateDefinition({
    ...state.formData.data.stateDefinition,
    seconds: (isSecondsType.value && !secondsPath.value) ? seconds.value : null,
    secondsPath: (isSecondsType.value && secondsPath.value) ? secondsPath.value : null,
    timestamp: (isTimestampType.value && !timestampPath.value) ? timestamp.value : null,
    timestampPath: (isTimestampType.value && timestampPath.value) ? timestampPath.value : null,
  });

  state.formData.data = new WaitNodeData({
    stateDefinition,
    isFormGroupValid: await validateFormGroup(),
  });

  props.onUpdate(objUtils.toRaw(state.formData));
};
</script>

<template>
  <WorkflowStateForm
    ref="form"
    :form-title-icon="StateConstant.Type.WAIT.icon"
    :form-title="$t(StateConstant.Type.WAIT.i18nTitle)"
    :form-title-icon-background="StateConstant.Type.WAIT.iconColor"
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
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldType')"
        required
      >
        <AppRadioGroup
          :id="id"
          v-model="state.type"
          :items="[
            {
              label: $t('__instructionWorkflowWaitInterval'),
              value: StateConstant.WaitType.SECONDS,
            },
            {
              label: $t('__instructionWorkflowWaitTimestamp'),
              value: StateConstant.WaitType.TIMESTAMP,
            },
          ]"
          @update:model-value="handleTypeChange"
        />
      </AppInputGroup>
      <template v-if="state.type === StateConstant.WaitType.SECONDS">
        <StateInputGroup
          v-model="state.formData.data.stateDefinition.seconds"
          :default-state-input="state.formData.data.stateDefinition.secondsPath"
          :label="$t('__fieldSecond', 2)"
          required
          :on-update="(v) => {
            const isStateInput = jsonPathUtils.isJsonPath(v);
            state.formData.data.stateDefinition[isStateInput ? 'secondsPath' : 'seconds'] = v;
            state.formData.data.stateDefinition[isStateInput ? 'seconds' : 'secondsPath'] = '';
            update();
          }"
        >
          <template #default="{ id, label }">
            <AppTextField
              :id="id"
              v-model.integer="state.formData.data.stateDefinition.seconds"
              type="number"
              :min="FlowWaitConstant.ActionExecutionParams.SECONDS.min"
              :max="FlowWaitConstant.ActionExecutionParams.SECONDS.max"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .gte(FlowWaitConstant.ActionExecutionParams.SECONDS.min)
                  .lte(FlowWaitConstant.ActionExecutionParams.SECONDS.max)
                  .collect()
              )"
              @update:model-value="() => {
                state.formData.data.stateDefinition.secondsPath = null;
                update();
              }"
            />
          </template>
        </StateInputGroup>
      </template>
      <template v-else-if="state.type === StateConstant.WaitType.TIMESTAMP">
        <StateInputGroup
          v-model="timestamp"
          :default-value="dayjs().format(DateConstant.Format.DATE_TIME_WITH_TZ)"
          :default-state-input="timestampPath"
          :label="timestampPath === null ? $t('__fieldDate') : $t('__fieldTimestamp')"
          required
          :on-update="(v) => {
            const isStateInput = jsonPathUtils.isJsonPath(v);
            state.formData.data.stateDefinition[isStateInput ? 'timestampPath' : 'timestamp'] = v;
            state.formData.data.stateDefinition[isStateInput ? 'timestamp' : 'timestampPath'] = '';
            if (!jsonPathUtils.isJsonPath(v)) {
              const { date, time, timeZone } = parseTimestamp(v);
              state.date = date;
              state.time = time;
              state.timeZone = timeZone;
            }
            update();
          }"
        >
          <template #default="{ id, label }">
            <AppDateInput
              :id="id"
              v-model="state.date"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .date(DateConstant.Format.FULL_DATE)
                  .collect()
              )"
              @update:model-value="update"
            />
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldTime')"
              required
            >
              <AppTextField
                :id="id"
                v-model="state.time"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .date(DateConstant.Format.TIME)
                    .collect()
                )"
                @update:model-value="update"
              />
            </AppInputGroup>
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldTimeZone')"
              required
            >
              <AppSelect
                :id="id"
                v-model="state.timeZone"
                :items="DateConstant.UtcOffsets.map((value) => ({
                  title: `UTC${value}`,
                  value,
                }))"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
                @update:model-value="update"
              />
            </AppInputGroup>
          </template>
        </StateInputGroup>
      </template>
      <WorkflowNextStateSelect
        v-model="state.formData.data.stateDefinition.next"
        :node="props.node"
        @update:model-value="handleNextStateUpdate"
      />
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
    </template>
    <template #input-output-fields>
      <WorkflowStateFormFieldsInputOutput
        v-model:form-data="state.formData.data.stateDefinition.inputOutput"
        :on-update="update"
      />
    </template>
  </WorkflowStateForm>
</template>

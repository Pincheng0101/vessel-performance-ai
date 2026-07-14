<script setup>
import { ExternalMemoryConstant } from '~/constants';

// TODO: This component will be replaced by ReferencePathInputGroup

const props = defineProps({
  required: {
    type: Boolean,
    default: false,
  },
  defaultValue: {
    type: undefined,
    default: undefined,
  },
  defaultStateInput: {
    type: String,
    default: '',
  },
  persistentSwitch: {
    type: Boolean,
    default: false,
  },
  additionalPathOptions: {
    type: Array,
    default: () => [],
  },
  enableSwitch: {
    type: Boolean,
    default: true,
  },
  schema: {
    type: Object,
    default: null,
  },
  tooltip: {
    type: String,
    default: null,
  },
  expectedValueTypes: {
    type: Array,
    default: () => [],
  },
  stateInputSwitchDisabled: {
    type: Boolean,
    default: false,
  },
  strictJsonSchema: {
    type: Boolean,
    default: true,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: undefined,
  default: undefined,
});

const stateInput = defineModel('stateInput', {
  type: String,
  default: '$',
});

const enableJsonInputSwitch = defineModel('enableJsonInputSwitch', {
  type: Boolean,
  default: false,
});

const enableStateInputSwitch = defineModel('enableStateInputSwitch', {
  type: Boolean,
  default: true,
});

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});

const useStateInput = defineModel('useStateInput', {
  type: Boolean,
  default: false,
});

const forceUseJsonInput = defineModel('forceUseJsonInput', {
  type: Boolean,
  default: false,
});

const forceUseStateInput = defineModel('forceUseStateInput', {
  type: Boolean,
  default: false,
});

const state = reactive({
  copiedModelValue: props.defaultValue,
});

// Warn if expectedValueTypes is missing when enableJsonSwitch is true
if (enableJsonInputSwitch.value && !props.schema && props.expectedValueTypes.length < 1) {
  console.warn('Missing required prop: "expectedValueTypes"');
}

const validateSchema = (value) => {
  if (value === null) return true;
  if (!props.schema) return true;
  if (objUtils.isEmpty(props.schema.properties)) return false;
  return jsonSchemaUtils.validate(value, props.schema);
};

const validateValueType = (value) => {
  if (props.defaultValue) {
    return getType(props.defaultValue) === getType(value);
  }
  if (props.expectedValueTypes.length > 0) {
    return props.expectedValueTypes.includes(getType(value));
  }
  return true;
};

const validateInput = (value) => {
  // Force using a specific input when schema validation fails or external memory is used
  const isInvalidInput = !validateSchema(value) || !validateValueType(value);
  forceUseJsonInput.value = props.forceUseJsonInput || isInvalidInput;
  if (forceUseJsonInput.value) {
    useJsonInput.value = forceUseJsonInput.value;
  }
};

const initializeState = () => {
  if (model.value) {
    // If the model value is a JSONPath, set it as the state input
    if (jsonPathUtils.isJsonPath(model.value)) {
      stateInput.value = model.value;
      useStateInput.value = true;
      return;
    }

    validateInput(model.value);

    // If JSON input is forced, append suffixes to the model value
    if (forceUseJsonInput.value) {
      model.value = referencePathUtils.addSuffixes(model.value);
    }

    state.copiedModelValue = model.value;
  }

  // If the default state input is a JSONPath, set it as the state input
  if (props.defaultStateInput && jsonPathUtils.isJsonPath(props.defaultStateInput)) {
    stateInput.value = props.defaultStateInput;
    useStateInput.value = true;
    return;
  }
};

const update = async () => {
  await nextTick();
  const updated = useStateInput.value && jsonPathUtils.isJsonPath(stateInput.value) ? stateInput.value : state.copiedModelValue;
  model.value = updated;
  props.onUpdate(updated);
};

const handleJsonInputSwitchToggle = async (v) => {
  await nextTick();
  if (forceUseJsonInput.value && !useStateInput.value) {
    // Force revert the toggle
    useJsonInput.value = true;
    update();
    return;
  }
  if (v) {
    useStateInput.value = false;
  }
  update();
};

const handleStateInputSwitchToggle = async (v) => {
  await nextTick();
  if (forceUseStateInput.value && !useJsonInput.value) {
    // Force revert the toggle
    useStateInput.value = true;
    update();
    return;
  }
  if (v) {
    useJsonInput.value = false;
  }
  update();
};

watch(model, (after) => {
  if (useStateInput.value) {
    return;
  }
  if (useJsonInput.value) {
    // Force using a specific input when schema validation fails or external memory is used
    const isInvalidInput = !validateSchema(after) || !validateValueType(after);
    forceUseJsonInput.value = props.forceUseJsonInput || isInvalidInput;
    forceUseStateInput.value = props.forceUseStateInput || isInvalidInput;
  }
  state.copiedModelValue = after;
});

watch(useJsonInput, (after) => {
  if (forceUseJsonInput.value) return;
  model.value = after
    ? referencePathUtils.addSuffixes(model.value)
    : referencePathUtils.removeSuffixes(model.value);
});

watch(forceUseJsonInput, (after) => {
  // Do nothing when the other input field is already in use
  if (useStateInput.value) return;
  // Use the input field when it is forced
  if (after) {
    useJsonInput.value = after;
  }
});

watch(forceUseStateInput, (after) => {
  // Do nothing when the other input field is already in use
  if (useJsonInput.value) return;
  // Use the input field when it is forced
  if (after) {
    useStateInput.value = after;
  }
});

initializeState();
</script>

<template>
  <AppInputGroup
    :persistent-right-slot="props.persistentSwitch"
    :tooltip="props.tooltip"
    :required="props.required"
  >
    <template
      v-if="props.enableSwitch"
      #right="{ id }"
    >
      <template v-if="enableJsonInputSwitch">
        <div class="d-flex align-center ga-1">
          <AppSwitch
            :id="`${id}-json-switch`"
            v-model="useJsonInput"
            :freezed="useJsonInput && forceUseJsonInput"
            aria-label="Use JSON"
            density="compact"
            size="xx-small"
            hide-details
            class="mb-0"
            @update:model-value="handleJsonInputSwitchToggle"
          />
          <AppInputLabel
            :for="`${id}-json-switch`"
            :label="$t('__actionUseJson')"
            class="text-caption mb-0"
          />
        </div>
      </template>
      <template v-if="enableStateInputSwitch">
        <div class="d-flex align-center ga-1">
          <AppSwitch
            :id="`${id}-state-input-switch`"
            v-model="useStateInput"
            :freezed="useStateInput && forceUseStateInput"
            aria-label="Use JSONPath"
            density="compact"
            :disabled="props.stateInputSwitchDisabled"
            size="xx-small"
            hide-details
            class="mb-0"
            @update:model-value="handleStateInputSwitchToggle"
          />
          <AppInputLabel
            :for="`${id}-state-input-switch`"
            :label="$t('__actionUseReferencePath')"
            class="text-caption mb-0"
          />
        </div>
      </template>
    </template>
    <template #default="{ id, label }">
      <template v-if="useStateInput">
        <StateInputCombobox
          :id="id"
          v-model="stateInput"
          :required="props.required"
          :label="label"
          :additional-path-options="props.additionalPathOptions"
          class="mb-2"
          @update:model-value="update"
        />
      </template>
      <template v-else-if="useJsonInput">
        <AppJsonEditor
          :id="id"
          v-model:object="model"
          allow-primitive
          fill-height
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField($t('__fieldInput'))
              .when({
                required: props.required,
                jsonSchema: props.schema,
              })
              .required()
              .json()
              .jsonSchema(
                findField(ExternalMemoryConstant.Type, model?.type, 'jsonSchema')
                  || objUtils.removeKeys(props.schema, (key) => key.startsWith('_')), // Remove custom properties for validation
                props.strictJsonSchema,
              )
              .apply('jsonPathBinding')
              .collect()
          )"
          @update:object="update"
        />
      </template>
      <template v-else-if="!jsonPathUtils.isJsonPath(model)">
        <slot
          :id="id"
          :label="label"
          :use-json-input="useJsonInput"
          name="default"
        />
      </template>
    </template>
  </AppInputGroup>
</template>

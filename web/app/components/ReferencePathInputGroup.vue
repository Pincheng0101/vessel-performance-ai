<script setup>
import { ExternalMemoryConstant } from '~/constants';

const props = defineProps({
  required: {
    type: Boolean,
    default: false,
  },
  defaultValue: {
    type: undefined,
    default: undefined,
  },
  defaultReferencePath: {
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
  tooltip: {
    type: String,
    default: null,
  },
  schema: {
    type: Object,
    default: null,
  },
  expectedValueTypes: {
    type: Array,
    default: () => [],
  },
  jsonPathSwitchDisabled: {
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

const referencePath = defineModel('referencePath', {
  type: String,
  default: '$',
});

const enableJsonSwitch = defineModel('enableJsonSwitch', {
  type: Boolean,
  default: false,
});

const enableReferencePathSwitch = defineModel('enableReferencePathSwitch', {
  type: Boolean,
  default: true,
});

const useJson = defineModel('useJson', {
  type: Boolean,
  default: false,
});

const useReferencePath = defineModel('useReferencePath', {
  type: Boolean,
  default: false,
});

const forceUseJson = defineModel('forceUseJson', {
  type: Boolean,
  default: false,
});

const forceUseReferencePath = defineModel('forceUseReferencePath', {
  type: Boolean,
  default: false,
});

// Warn if expectedValueTypes is missing when enableJsonSwitch is true
if (enableJsonSwitch.value && !props.schema && props.expectedValueTypes.length < 1) {
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

const state = reactive({
  copiedModelValue: props.defaultValue,
});

const validateInput = (value) => {
  // Force using a specific input when schema validation fails or external memory is used
  const isInvalidInput = !validateSchema(value) || !validateValueType(value);
  forceUseJson.value = props.forceUseJson || isInvalidInput;
  if (forceUseJson.value) {
    useJson.value = forceUseJson.value;
  }
};

const initializeState = () => {
  if (model.value) {
    // If the model value is a JSONPath, set it as the reference Path
    if (referencePathUtils.isReferencePath(model.value)) {
      referencePath.value = model.value;
      useReferencePath.value = true;
      return;
    }

    validateInput(model.value);

    state.copiedModelValue = model.value;
  }

  // If the default reference Path is a JSONPath, set it as the reference Path
  if (props.defaultReferencePath && referencePathUtils.isReferencePath(props.defaultReferencePath)) {
    referencePath.value = props.defaultReferencePath;
    useReferencePath.value = true;
    return;
  }
};

const update = async () => {
  await nextTick();
  const updated = useReferencePath.value && referencePathUtils.isReferencePath(referencePath.value) ? referencePath.value : state.copiedModelValue;
  model.value = updated;
  props.onUpdate(updated);
};

const handleJsonSwitchToggle = async (v) => {
  await nextTick();
  if (forceUseJson.value && !useReferencePath.value) {
    // Force revert the toggle
    useJson.value = true;
    update();
    return;
  }
  if (v) {
    useReferencePath.value = false;
  }
  update();
};

const handleReferencePathUpdate = (v) => {
  if (useReferencePath.value) {
    referencePath.value = v;
    update();
    return;
  }
  state.copiedModelValue = v;
  update();
};

const handleReferencePathSwitchToggle = async (v) => {
  await nextTick();
  if (forceUseReferencePath.value) {
    // Force revert the toggle
    useReferencePath.value = true;
  }
  if (v) {
    useJson.value = false;
  }
  update();
};

watch(model, (after) => {
  if (referencePathUtils.isReferencePath(after)) {
    return;
  }
  validateInput(after);
  state.copiedModelValue = after;
});

watch(useJson, (after) => {
  if (forceUseJson.value) return;
  if (after) {
    // Fix draft data when some keys are missing suffixes
    model.value = referencePathUtils.addSuffixes(model.value);
  }
});

watch(forceUseReferencePath, (after) => {
  // Use the input field when it is forced
  if (after) {
    useReferencePath.value = after;
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
      <template v-if="enableJsonSwitch">
        <div class="d-flex align-center ga-1">
          <AppSwitch
            :id="`${id}-json-switch`"
            v-model="useJson"
            :freezed="useJson && forceUseJson"
            aria-label="Use JSON"
            density="compact"
            size="xx-small"
            hide-details
            class="mb-0"
            @update:model-value="handleJsonSwitchToggle"
          />
          <AppInputLabel
            :for="`${id}-json-switch`"
            :label="$t('__actionUseJson')"
            class="text-caption mb-0"
          />
        </div>
      </template>
      <template v-if="enableReferencePathSwitch">
        <div class="d-flex align-center ga-1">
          <AppSwitch
            :id="`${id}-json-path-switch`"
            v-model="useReferencePath"
            :freezed="useReferencePath && forceUseReferencePath"
            aria-label="Use JSONPath"
            density="compact"
            :disabled="props.jsonPathSwitchDisabled"
            size="xx-small"
            hide-details
            class="mb-0"
            @update:model-value="handleReferencePathSwitchToggle"
          />
          <AppInputLabel
            :for="`${id}-json-path-switch`"
            :label="$t('__actionUseReferencePath')"
            class="text-caption mb-0"
          />
        </div>
      </template>
    </template>
    <template #default="{ id, label }">
      <template v-if="useReferencePath || referencePathUtils.isReferencePath(model)">
        <ReferencePathInput
          :id="id"
          v-model="model"
          :label="label"
          :required="props.required"
          @update:model-value="handleReferencePathUpdate"
        />
      </template>
      <template v-else-if="useJson">
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
      <template v-else>
        <slot
          :id="id"
          :label="label"
          name="default"
        />
      </template>
    </template>
  </AppInputGroup>
</template>

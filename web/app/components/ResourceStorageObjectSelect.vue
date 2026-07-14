<script setup>
/**
 * @import { Storage } from '~/models/server/storage'
 */

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: [String, Object],
    default: null,
  },
  hint: {
    type: String,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  returnObject: {
    type: Boolean,
    default: true,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
  required: {
    type: Boolean,
    default: true,
  },
  enableStateInputSwitch: {
    type: Boolean,
    default: true,
  },
  disableCondition: {
    type: Object,
    default: null,
  },
  disabledTooltip: {
    type: String,
    default: null,
  },
});

const server = useServer();
const { t } = useI18n();

const model = defineModel({
  type: [String, Array, Object],
  default: null,
});

const restoredObjects = defineModel('restoredObjects', {
  type: [String, Array, Object],
  default: null,
});

const state = reactive({
  isLoading: false,
  errorMessage: null,
  commonPrefix: '',
});

const findCommonPrefix = (path) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
};

const setStateCommonPrefix = () => {
  if (!model.value || model.value.length === 0) return;
  const shortestDepthPath = props.multipleSelect && Array.isArray(model.value)
    ? model.value.reduce((min, curr) => {
        const slashCount = (curr.match(/\//g) || []).length;
        const minSlashCount = (min.match(/\//g) || []).length;
        return slashCount < minSlashCount ? curr : min;
      })
    : model.value;
  state.commonPrefix = shortestDepthPath.includes('/')
    ? findCommonPrefix(shortestDepthPath)
    : '';
};

const initializeState = () => {
  setStateCommonPrefix();
};

const fetchItem = async (id) => {
  const { data, error } = await server.storageObject.get({
    storageId: props.storage.storageId,
    objectPath: id,
  }, { lazy: false });
  if (error.value) {
    state.errorMessage = t('__validationInvalidValue');
    return;
  }
  state.errorMessage = null;
  return data.value;
};

const fetchAllItems = async () => {
  const result = [];
  let nextToken = null;
  do {
    const { data, error } = await server.storageObject.list({
      storageId: props.storage.storageId,
      prefix: '',
      nextToken,
      delimiter: '',
    }, {
      lazy: false,
    });
    if (error.value) {
      return;
    }
    const objects = data.value?.data;
    result.push(...objects);
    nextToken = data.value.nextToken;
  } while (nextToken);
  return result;
};

const restoreItems = async () => {
  state.isLoading = true;
  try {
    if (props.multipleSelect) {
      const paths = model.value;
      const allItems = await fetchAllItems();
      restoredObjects.value = allItems.filter(item => paths.includes(item.id));
      return;
    }
    const id = props.returnObject ? model.value.id : model.value;
    restoredObjects.value = await fetchItem(id) || id;
    return;
  } catch (error) {
    console.warn(error);
    model.value = null;
  } finally {
    state.isLoading = false;
  }
};

const initializeItems = async () => {
  // Return early if model value is empty
  if (!model.value || model.value.length < 1) {
    return;
  }

  // Return early if model value lacks an id
  if (props.returnObject && !model.value.id) {
    return;
  }

  // Return early if model value is a JSONPath
  if (jsonPathUtils.isJsonPath(model.value)) {
    return;
  }

  await restoreItems();
};

// Update restored objects when model value changed from the table
watch(() => model.value, (after, before) => {
  if (!after) {
    restoredObjects.value = null;
    return;
  }
  if (before && props.multipleSelect && JSON.stringify(after) !== JSON.stringify(before) && Array.isArray(restoredObjects.value)) {
    restoredObjects.value = restoredObjects.value.filter(obj => model.value.includes(obj.id));
  }
  setStateCommonPrefix();
});

// Update model value when restored objects changed from the combobox
watch(() => restoredObjects.value, (after) => {
  if (!after) {
    model.value = null;
    return;
  }
  if (props.multipleSelect && Array.isArray(model.value)) {
    model.value = props.returnObject ? after : after.map(item => item.id);
    if (after.every(item => objUtils.isObject(item))) {
      state.errorMessage = null;
    }
    return;
  }
  if (objUtils.isObject(after)) {
    state.errorMessage = null;
  }
});

watch(() => props.notFoundObjectId, (after) => {
  state.errorMessage = t('__validationInvalidValue');
  if (props.multipleSelect) {
    // Consistently display error messages using id
    restoredObjects.value = restoredObjects.value.map(object => object.id === after ? after : object);
    return;
  }
  restoredObjects.value = props.returnObject ? model.value.id : model.value;
});

const submit = (v) => {
  if (!v) return;

  model.value = props.multipleSelect
    ? (props.returnObject ? v : v.map(item => item.id))
    : (props.returnObject ? v : v.id);

  restoredObjects.value = v;
};

initializeState();
initializeItems();
</script>

<template>
  <StateInputGroup
    v-model="model"
    :label="$t('__fieldFile', props.multipleSelect ? 2 : 1)"
    :enable-state-input-switch="props.enableStateInputSwitch"
    :required="props.required"
  >
    <template #default="{ id, label }">
      <AppDialog
        :on-submit="submit"
        :width="1000"
        aria-label="Resource Storage Object Dialog"
      >
        <template #activator="{ onOpen }">
          <AppCombobox
            :id="id"
            v-model="model"
            :disabled="props.disabled"
            item-title="name"
            item-value="id"
            append-inner-icon="mdi-pencil"
            :chips="props.multipleSelect"
            :multiple="props.multipleSelect"
            :loading="state.isLoading"
            :hint="props.hint"
            :readonly="!props.multipleSelect"
            :rules="(
              $validator
                .defineField(label)
                .when({
                  required: props.required,
                })
                .required()
                .collect()
            )"
            :error-messages="state.errorMessage"
            class="clickable"
            @click:control="!state.isLoading && onOpen()"
            @click:append-inner="!state.isLoading && onOpen()"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceStorageObjectSelectList
            :storage="props.storage"
            :multiple-select="props.multipleSelect"
            :restored-objects="restoredObjects"
            :selected-id="props.multipleSelect ? null : model"
            :selected-ids="props.multipleSelect ? model : null"
            :return-object="props.returnObject"
            :common-prefix="state.commonPrefix"
            :disable-condition="props.disableCondition"
            :disabled-tooltip="props.disabledTooltip"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </StateInputGroup>
</template>

<script setup>
import { AccountConstant, ListConstant, ResourceConstant } from '~/constants';
import { MultiRequestResourceQuery } from '~/models/server/multiRequest';

const props = defineProps({
  module: {
    type: String,
    required: true,
  },
  instruction: {
    type: String,
    default: null,
  },
  fieldName: {
    type: String,
    default: '',
  },
  formComponent: {
    type: Object,
    default: null,
  },
  allowCreate: {
    type: Boolean,
    default: true,
  },
  headers: {
    type: Array,
    default: null,
  },
  hint: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  filterLogic: {
    type: String,
    default: undefined,
  },
  filters: {
    type: Array,
    default: () => [],
  },
  disableCondition: {
    type: Object,
    default: null,
  },
  disabledTooltip: {
    type: String,
    default: '',
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
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  enableStateInputSwitch: {
    type: Boolean,
    default: false,
  },
  listMethod: {
    type: String,
    default: 'list',
  },
  tooltip: {
    type: String,
    default: null,
  },
  arrayLengthLte: {
    type: Number,
    default: null,
  },
  perPageOptions: {
    type: Array,
    default: () => ListConstant.ItemsPerPageOption.LIST,
  },
  maxSelectedItems: {
    type: Number,
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
});

const selectableModules = {
  ...ResourceConstant.Type,
  ADMIN_MANAGED_GROUP: AccountConstant.Base.ADMIN_MANAGED_GROUP,
  ADMIN_MANAGED_USER: AccountConstant.Base.ADMIN_MANAGED_USER,
};

const itemIdField = computed(() => findField(selectableModules, props.module, 'id', 'module'));
const itemSnakeIdField = computed(() => findField(selectableModules, props.module, 'getEndpointId', 'module'));

const getRestoredObjectType = (item) => {
  const typeField = findField(ResourceConstant.Type, props.module, 'typeField', 'module');
  return item.type || (typeField ? item[typeField] : null);
};

const iconPath = computed(() => {
  if (props.multipleSelect || !restoredObjects.value) return null;
  const resourceType = findField(ResourceConstant.Type, props.module, 'type', 'module');
  const restoredObjectType = getRestoredObjectType(restoredObjects.value);
  if (!restoredObjectType) return findField(selectableModules, props.module, 'iconPath', 'module');
  return findField(resourceType, restoredObjectType, 'iconPath') || findField(selectableModules, props.module, 'iconPath', 'module');
});

const icon = computed(() => {
  if (props.multipleSelect || !restoredObjects.value) return null;
  const resourceType = findField(ResourceConstant.Type, props.module, 'type', 'module');
  const restoredObjectType = getRestoredObjectType(restoredObjects.value);
  if (restoredObjectType) {
    return findField(resourceType, restoredObjectType, 'icon') || findField(selectableModules, props.module, 'icon', 'module');
  }
  return findField(selectableModules, restoredObjects.value.resourceType, 'icon') || findField(selectableModules, props.module, 'icon', 'module');
});

const getItemId = (item) => {
  if (!objUtils.isObject(item)) return item;
  return item.id
    || (itemIdField.value ? item[itemIdField.value] : null)
    || (itemSnakeIdField.value ? item[itemSnakeIdField.value] : null);
};

const getIds = (value) => {
  if (!value) return [];
  if (props.multipleSelect) {
    return Array.isArray(value) ? value.map(getItemId).filter(Boolean) : [];
  }
  const id = getItemId(value);
  return id ? [id] : [];
};

const isSameSelection = (a, b) => {
  const aIds = getIds(a);
  const bIds = getIds(b);
  return arrUtils.isEqualOrdered(aIds, bIds);
};

const fetchItem = async (id) => {
  const getMethod = findField(selectableModules, props.module, 'getMethod', 'module') || 'get';
  const requestParam = findField(selectableModules, props.module, 'id', 'module');
  const { data, error } = await server[props.module][getMethod]({ [requestParam]: id }, { lazy: false });
  if (error.value) {
    state.errorMessage = t('__validationInvalidValue');
    return;
  }
  state.errorMessage = null;
  return data.value;
};

/**
 * @param {MultiRequestResourceQuery[]} queries
 */
const fetchItems = async (queries) => {
  const { data } = await server.multiRequest.get(queries, { lazy: false });
  return data.value;
};

const restoreItems = async (value = model.value) => {
  state.isLoading = true;
  try {
    if (props.multipleSelect) {
      // Multi request only supports fetching resources
      const isResource = findField(ResourceConstant.Type, props.module, 'id');
      if (!isResource) return;

      const queries = value
        .filter(item => !referencePathUtils.isReferencePath(item))
        .map(item => new MultiRequestResourceQuery({ id: getItemId(item), type: props.module }));
      const items = await fetchItems(queries);
      restoredObjects.value = Object.values(items[findField(ResourceConstant.Type, props.module, 'listKey', 'module')]);
      return;
    }
    const id = props.returnObject ? getItemId(value) : value;
    if (!id) return;
    restoredObjects.value = await fetchItem(id);
    return;
  } catch {
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

  // Return early if model value is a json path or external memory object
  if (referencePathUtils.isReferencePath(model.value)) return;

  // Return early if model value lacks an id (single-select only; multipleSelect uses array)
  if (props.returnObject && !props.multipleSelect && !getItemId(model.value)) {
    return;
  }

  await restoreItems();
};

// Update restored objects when model value changed from the table
watch(() => model.value, async (after) => {
  if (after === null) {
    restoredObjects.value = null;
    return;
  }
  if (isSameSelection(after, restoredObjects.value)) return;
  await restoreItems();
});

// Update model value when restored objects changed from the combobox
watch(() => restoredObjects.value, (after) => {
  if (!after || arrUtils.isEmpty(after)) {
    model.value = null;
    state.errorMessage = null;
    return;
  }
  if (props.multipleSelect) {
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
    restoredObjects.value = restoredObjects.value.map(object => getItemId(object) === after ? after : object);
    return;
  }
  restoredObjects.value = props.returnObject ? getItemId(model.value) : model.value;
});

const submit = async (v) => {
  const submittedValue = props.multipleSelect ? v : (Array.isArray(v) ? v[0] : v);
  if (!submittedValue) return;

  const nextModelValue = props.multipleSelect
    ? (props.returnObject ? submittedValue : submittedValue.map(item => item.id))
    : (props.returnObject ? submittedValue : submittedValue.id);

  model.value = nextModelValue;
  restoredObjects.value = submittedValue;

  await restoreItems(nextModelValue);
};

initializeItems();
</script>

<template>
  <StateInputGroup
    v-model="model"
    :label="props.fieldName || $t('__fieldResource')"
    :required="props.required"
    :tooltip="props.tooltip"
    :enable-switch="props.enableStateInputSwitch"
  >
    <template #default="{ id, label }">
      <AppDialog
        :on-submit="submit"
        :width="1000"
        aria-label="Resource Dialog"
      >
        <template #activator="{ onOpen }">
          <AppCombobox
            :id="id"
            v-model="restoredObjects"
            :clearable="props.clearable"
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
                  arrayLengthLte: props.arrayLengthLte,
                })
                .required()
                .arrayLengthLte(props.arrayLengthLte)
                .collect()
            )"
            :error-messages="state.errorMessage"
            class="clickable"
            @click:control="onOpen"
            @click:append-inner="onOpen"
          >
            <template
              v-if="$slots.chip"
              #chip="slotProps"
            >
              <slot
                name="chip"
                v-bind="slotProps"
              />
            </template>
            <template
              v-if="iconPath"
              #prepend-inner
            >
              <AppImageIcon
                :src="iconPath"
                class="flex-grow-0 mr-1"
              />
            </template>
            <template
              v-else-if="icon"
              #prepend-inner
            >
              <v-icon
                :icon="icon"
                color="primary"
                class="mr-2"
              />
            </template>
            <template
              v-if="$slots.append"
              #append
            >
              <slot name="append" />
            </template>
          </AppCombobox>
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourcePaginatedSelectTable
            :field-name="props.fieldName || $t('__fieldResource')"
            :headers="props.headers || [
              {
                title: $t('__fieldName'),
                key: 'name',
                sortable: true,
                sortKey: `${findField(ResourceConstant.Type, props.module, 'value', 'module')}_name`,
                link: item => {
                  const resourceType = findField(ResourceConstant.Type, props.module, 'value', 'module');
                  const fullPath = resourceUtils.getUrl(resourceType, item.id);
                  return { href: fullPath, target: '_blank' };
                },
              },
              { title: $t('__fieldStatus'), key: 'status', isStatus: true },
              { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
            ]"
            :instruction="props.instruction"
            :module="props.module"
            :multiple-select="props.multipleSelect"
            :allow-create="props.allowCreate"
            :restored-objects="props.multipleSelect ? restoredObjects : null"
            :form-component="props.formComponent"
            :selected-id="props.multipleSelect ? null : restoredObjects?.id"
            :selected-ids="props.multipleSelect ? restoredObjects?.map(item => item.id) : null"
            :title="props.title || $t('__fieldResource', 2)"
            :filter-logic="props.filterLogic"
            :filters="props.filters"
            :disable-condition="props.disableCondition"
            :disabled-tooltip="props.disabledTooltip"
            :return-object="props.returnObject"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :hidden-fields="props.hiddenFields"
            :per-page-options="props.perPageOptions"
            :max-selected-items="props.maxSelectedItems"
          />
        </template>
      </AppDialog>
    </template>
  </StateInputGroup>
</template>

<script setup>
import { McpServerConstant } from '~/constants';

const props = defineProps({
  mcpServerId: {
    type: String,
    default: null,
  },
  authType: {
    type: String,
    default: null,
  },
  authPending: {
    type: Boolean,
    default: false,
  },
  endpointUrl: {
    type: String,
    default: null,
  },
  required: {
    type: Boolean,
    default: false,
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
  enableStateInputSwitch: {
    type: Boolean,
    default: true,
  },
  tooltip: {
    type: String,
    default: null,
  },
  showLabel: {
    type: Boolean,
    default: true,
  },
  notFoundObjectId: {
    type: String,
    default: null,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const server = useServer();

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
  items: [],
});

const fetchItems = async () => {
  // Listing tools on an OAuth server requires an access token, which only the
  // selection dialog can obtain through the authorization flow.
  if (props.authType === McpServerConstant.StreamableHttpAuthType.OAUTH.value) {
    return;
  }
  const { data, error } = await server.mcpServer.listTools({
    mcpServerId: props.mcpServerId,
  }, {
    lazy: false,
  });
  if (error.value) {
    return;
  }
  state.items = data.value.data;
};

const restoreItems = async () => {
  state.isLoading = true;
  try {
    if (props.multipleSelect) {
      // Tool ids double as names, so chips restore without calling the API — the
      // selection dialog fetches the list (running the OAuth flow when needed) on open
      restoredObjects.value = model.value.map(id => ({ id, name: id }));
      return;
    }
    await fetchItems();
    const id = props.returnObject ? model.value.id : model.value;
    restoredObjects.value = state.items.find(item => item.id === id) || id;
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
  if (props.onUpdate) {
    props.onUpdate(model.value);
  }
};

// Defer restoring until the parent has resolved the server's auth type — the restore
// fetch must be skipped for OAuth servers, which is unknowable while auth is pending
if (props.authPending) {
  const unwatch = watch(() => props.authPending, (pending) => {
    if (pending) return;
    unwatch();
    initializeItems();
  });
} else {
  initializeItems();
}
</script>

<template>
  <StateInputGroup
    v-model="model"
    :label="props.showLabel ? $t('__fieldLlmMcpServerTool', props.multipleSelect ? 2 : 1) : ''"
    :tooltip="props.tooltip"
    :enable-state-input-switch="props.enableStateInputSwitch"
    :required="props.required"
  >
    <template #default="{ id, label }">
      <AppDialog
        :on-submit="submit"
        :width="1000"
        aria-label="MCP Server Tools Dialog"
      >
        <template #activator="{ onOpen }">
          <template v-if="$slots.activator">
            <slot
              :on-open="onOpen"
              name="activator"
            />
          </template>
          <template v-else>
            <AppCombobox
              :id="id"
              v-model="model"
              :disabled="props.disabled"
              item-title="name"
              item-value="id"
              :append-inner-icon="props.mcpServerId ? 'mdi-pencil' : null"
              :chips="props.multipleSelect"
              :multiple="props.multipleSelect"
              :loading="state.isLoading"
              :hint="props.hint"
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
              @click:control="!state.isLoading && onOpen()"
              @click:append-inner="!state.isLoading && onOpen()"
            />
          </template>
        </template>
        <template #body="{ onSubmit, onCancel }">
          <McpServerToolSelectList
            :mcp-server-id="props.mcpServerId"
            :auth-type="props.authType"
            :endpoint-url="props.endpointUrl"
            :items="state.items"
            :multiple-select="props.multipleSelect"
            :restored-objects="restoredObjects"
            :selected-ids="props.multipleSelect ? restoredObjects?.map(item => item.id) : null"
            :selected-id="props.multipleSelect ? null : restoredObjects?.id"
            :return-object="props.returnObject"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </StateInputGroup>
</template>
